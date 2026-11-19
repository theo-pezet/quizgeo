import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * L'aperçu du bac à sable sur Android et iOS : une WebView qui affiche la page
 * construite par buildSandboxDoc. Les console.log arrivent par onMessage.
 * (Sur le web : Preview.web.tsx, une iframe.)
 */
export function Preview({ html, onConsole }: { html: string; onConsole?: (line: string) => void }) {
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      onMessage={(e) => onConsole?.(e.nativeEvent.data)}
      style={styles.view}
    />
  );
}

const styles = StyleSheet.create({
  view: { flex: 1, backgroundColor: '#ffffff' },
});
