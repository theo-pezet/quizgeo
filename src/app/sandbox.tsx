import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Preview } from '@/features/sandbox/Preview';
import { useT, type Key } from '@/i18n';
import { buildSandboxDoc, type SandboxLang } from '@/lib/sandbox';
import { Button, Icon, Screen, Text, font, radius, space, useColors } from '@/ui';

const LANGS: readonly SandboxLang[] = ['css', 'html', 'js'];
const MAX_LINES = 50;

/**
 * Le bac à sable : le code d'un exercice, modifiable, avec son rendu. CSS et
 * HTML se mettent à jour en direct ; JavaScript tourne quand on appuie sur
 * « Run », et ses console.log s'affichent dessous (PRIMM : exécuter, modifier).
 */
export default function SandboxRoute() {
  const colors = useColors();
  const t = useT();
  const params = useLocalSearchParams<{ lang?: string; code?: string }>();
  const lang: SandboxLang = LANGS.includes(params.lang as SandboxLang) ? (params.lang as SandboxLang) : 'css';
  const original = typeof params.code === 'string' ? params.code : '';
  const [code, setCode] = useState(original);
  // CSS et HTML : rendu en direct (léger délai pendant la frappe). JS : à la demande.
  const [rendered, setRendered] = useState(original);
  const [runId, setRunId] = useState(0);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (lang === 'js') return undefined;
    const timer = setTimeout(() => setRendered(code), 350);
    return () => clearTimeout(timer);
  }, [code, lang]);

  const html = useMemo(() => buildSandboxDoc({ lang, code: rendered }), [lang, rendered]);
  const onConsole = useCallback((line: string) => setLines((l) => [...l, line].slice(-MAX_LINES)), []);
  const run = () => {
    setLines([]);
    setRendered(code);
    setRunId((n) => n + 1);
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Icon name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Text variant="h2" style={styles.grow}>
          {t('sandbox.title')} · {lang.toUpperCase()}
        </Text>
        <Button label={t('sandbox.reset')} size="sm" tone="ghost" onPress={() => setCode(original)} />
      </View>
      <Text variant="small" secondary>
        {t(`sandbox.note.${lang}` as Key)}
      </Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        style={[styles.editor, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]}
      />
      {lang === 'js' && <Button label={t('sandbox.run')} onPress={run} />}
      <Text variant="small" secondary style={styles.label}>
        {t('sandbox.preview')}
      </Text>
      <View style={[styles.preview, { borderColor: colors.border }]}>
        <Preview key={lang === 'js' ? runId : 0} html={html} onConsole={onConsole} />
      </View>
      {lang !== 'css' && (
        <View style={[styles.console, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text variant="small" secondary style={styles.label}>
            {t('sandbox.console')}
          </Text>
          <ScrollView style={styles.consoleScroll}>
            {lines.length === 0 ? (
              <Text variant="small" secondary>
                {t('sandbox.consoleEmpty')}
              </Text>
            ) : (
              lines.map((line, i) => (
                <Text key={i} variant="mono">
                  {line}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  editor: { borderWidth: 2, borderRadius: radius.md, padding: space.md, minHeight: 140, textAlignVertical: 'top', ...font.mono },
  label: { fontWeight: '800', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 },
  preview: { height: 280, borderWidth: 2, borderRadius: radius.md, overflow: 'hidden' },
  console: { borderWidth: 2, borderRadius: radius.md, padding: space.md, gap: space.xs },
  consoleScroll: { maxHeight: 160 },
});
