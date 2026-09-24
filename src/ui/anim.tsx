/**
 * Petites animations de récompense, avec l'API Animated de React Native :
 * fiable sur Android comme sur le web, sans configuration.
 */

import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';

import { useColors } from './tokens';

/** Apparition : monte de 16 px en fondu. `delay` en ms pour les cascades. */
export function FadeUp({ children, delay = 0, style }: PropsWithChildren<{ delay?: number; style?: ViewStyle }>) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 360, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Pop : surgit avec un ressort. Rejoue quand `trigger` change. */
export function Pop({ children, delay = 0, trigger = 0, style }: PropsWithChildren<{ delay?: number; trigger?: number | string; style?: ViewStyle }>) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(v, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [v, delay, trigger]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/** Le réglage système « Réduire les animations » (suivi en direct). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((on) => alive && setReduce(on))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}

/**
 * Pulsation continue, pour le nœud « à jouer » du parcours. Le parent la
 * coupe (`active`) quand l'écran n'est pas visible ; elle s'arrête aussi si
 * l'utilisateur a demandé moins d'animations.
 */
export function Pulse({ children, active = true, style }: PropsWithChildren<{ active?: boolean; style?: ViewStyle }>) {
  const v = useRef(new Animated.Value(1)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (!active || reduce) {
      v.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1.08, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, active, reduce]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/** Secousse horizontale, pour une mauvaise réponse. Rejoue quand `trigger` change. */
export function Shake({ children, trigger, style }: PropsWithChildren<{ trigger: number | string | null; style?: ViewStyle }>) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (trigger === null) return;
    v.setValue(0);
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [v, trigger]);
  return <Animated.View style={[style, { transform: [{ translateX: v.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }] }]}>{children}</Animated.View>;
}

/** Compteur qui monte de 0 à `value` en `duration` ms. */
export function useCountUp(value: number, duration = 800, delay = 0): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (value <= 0) {
      setShown(0);
      return;
    }
    let frame = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, delay]);
  return shown;
}

const CONFETTI_COLORS = ['#FF6B35', '#F97316', '#F5B301', '#1FA463', '#E2445C', '#7C3AED'];

/** Pluie de confettis, une fois, sur toute la largeur du parent (absolu). */
export function Confetti({ count = 28, duration = 1800 }: { count?: number; duration?: number }) {
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      x: (i / count) * 100 + (i % 3) * 3,
      drift: ((i * 37) % 40) - 20,
      size: 6 + (i % 4) * 2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: (i * 53) % 400,
      spin: (i % 2 === 0 ? 1 : -1) * (360 + (i * 41) % 360),
      v: new Animated.Value(0),
    })),
  ).current;
  useEffect(() => {
    Animated.stagger(
      12,
      pieces.map((p) => Animated.timing(p.v, { toValue: 1, duration, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true })),
    ).start();
  }, [pieces, duration]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: -12,
            width: p.size,
            height: p.size * 1.6,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: p.v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, 520] }) },
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/**
 * Anneau de progression en segments (pas de SVG nécessaire). `ratio` 0..1.
 * Les enfants sont centrés dans l'anneau.
 */
export function Ring({
  ratio,
  size = 72,
  segments = 36,
  color,
  children,
}: PropsWithChildren<{ ratio: number; size?: number; segments?: number; color?: string }>) {
  const colors = useColors();
  const accent = color ?? colors.primary;
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * segments);
  const r = size / 2;
  const barH = Math.max(6, size * 0.11);
  const barW = Math.max(2, size * 0.045);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: segments }, (_, i) => {
        const angle = (i / segments) * 360;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: r - barW / 2,
              top: 0,
              width: barW,
              height: barH,
              borderRadius: barW,
              backgroundColor: i < filled ? accent : colors.surfaceAlt,
              transform: [{ translateY: r }, { rotate: `${angle}deg` }, { translateY: -r }],
            }}
          />
        );
      })}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
