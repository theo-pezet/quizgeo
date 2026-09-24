/**
 * Le bouton d'action d'une question (« Vérifier », « Décision suivante »…)
 * vit dans la barre FIXE du bas de l'écran de session, comme « Continuer » :
 * il reste visible sans défiler, même sous un QCM aux choix très longs.
 *
 * Chaque vue déclare son action avec `useSessionAction`. Dans une session,
 * l'écran la reçoit par contexte et l'affiche dans `Screen.footer`. Sans
 * contexte (test de niveau, tests), la vue rend le bouton en ligne.
 */

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useT } from '@/i18n';
import { Button, Icon, Text, space, useColors } from '@/ui';

import { feedbackTone } from './FeedbackPanel';

/** Retour immédiat affiché au-dessus du bouton (étape d'un cas pratique). */
export interface ActionNote {
  text: string;
  correct: boolean;
}

export interface SessionAction {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  note?: ActionNote;
}

interface SessionActionApi {
  /** L'action courante, ou null quand la vue n'en propose pas. */
  setAction: (action: SessionAction | null) => void;
  /** Remonte le contenu en haut (nouvelle étape d'un cas pratique). */
  scrollToTop: () => void;
}

const SessionActionContext = createContext<SessionActionApi | null>(null);

export const SessionActionProvider = SessionActionContext.Provider;

/** Remonter en haut de l'écran, quand un écran de session le permet. */
export function useScrollToTop(): () => void {
  const api = useContext(SessionActionContext);
  return api?.scrollToTop ?? noop;
}

function noop() {}

/**
 * Déclare l'action de la vue. Renvoie le bouton à rendre en ligne quand
 * aucun écran de session ne l'accueille, sinon null.
 */
export function useSessionAction(action: SessionAction | null): ReactNode {
  const api = useContext(SessionActionContext);
  const setAction = api?.setAction;
  const press = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    press.current = action?.onPress;
  });

  const visible = action !== null;
  const label = action?.label ?? '';
  const disabled = action?.disabled ?? false;
  const noteText = action?.note?.text;
  const noteCorrect = action?.note?.correct ?? false;

  useEffect(() => {
    if (!setAction) return;
    setAction(
      visible
        ? {
            label,
            disabled,
            onPress: () => press.current?.(),
            note: noteText === undefined ? undefined : { text: noteText, correct: noteCorrect },
          }
        : null,
    );
  }, [setAction, visible, label, disabled, noteText, noteCorrect]);

  useEffect(() => () => setAction?.(null), [setAction]);

  if (setAction || action === null) return null;
  return <ActionBar action={action} />;
}

/** Le bouton et sa note éventuelle : même rendu en ligne et dans la barre. */
export function ActionBar({ action, color }: { action: SessionAction; color?: string }) {
  const colors = useColors();
  const t = useT();
  const { height } = useWindowDimensions();
  const tone = action.note ? feedbackTone(colors, action.note.correct) : null;
  return (
    <View style={styles.bar}>
      {action.note && tone && (
        <View style={styles.note}>
          <View style={styles.head}>
            <Icon name={action.note.correct ? 'checkmark-circle' : 'close-circle'} size={22} color={tone.text} />
            <Text variant="bodyBold" style={{ color: tone.text }}>
              {action.note.correct ? t('session.correct') : t('session.wrong')}
            </Text>
          </View>
          <ScrollView style={{ maxHeight: Math.round(height * 0.25) }} showsVerticalScrollIndicator>
            <Text variant="small" style={styles.noteText}>
              {action.note.text}
            </Text>
          </ScrollView>
        </View>
      )}
      <Button
        label={action.label}
        disabled={action.disabled}
        color={color}
        tone={tone ? (action.note?.correct ? 'success' : 'danger') : 'primary'}
        onPress={action.onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: space.md },
  note: { gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  noteText: { lineHeight: 19 },
});
