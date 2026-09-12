import { Text as RNText, type TextProps } from 'react-native';

import { font, useColors } from './tokens';

type Variant = keyof typeof font;

export function Text({
  variant = 'body',
  secondary = false,
  style,
  ...rest
}: TextProps & { variant?: Variant; secondary?: boolean }) {
  const colors = useColors();
  return (
    <RNText
      {...rest}
      style={[font[variant], { color: secondary ? colors.textSecondary : colors.text }, style]}
    />
  );
}
