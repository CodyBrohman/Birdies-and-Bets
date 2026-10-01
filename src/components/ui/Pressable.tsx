import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable as RNPressable, type PressableProps as RNPressableProps, type PressableStateCallbackType, type StyleProp, type View, type ViewStyle } from 'react-native';

export interface PressState extends PressableStateCallbackType {
  hovered: boolean;
  focused: boolean;
}

export interface PressableProps extends Omit<RNPressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle> | ((state: PressState) => StyleProp<ViewStyle>);
  children?: ReactNode | ((state: PressState) => ReactNode);
}

/**
 * Drop-in Pressable that resolves function styles itself and hands React Native a plain style.
 * On iOS the NativeWind-wrapped Pressable dropped function styles entirely (cards lost their fill,
 * buttons their background, the tab bar its flex), so every pressable in the app goes through this.
 */
export const Pressable = forwardRef<View, PressableProps>(function Pressable({ style, children, onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur, ...rest }, ref) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const state: PressState = { pressed, hovered, focused };
  return (
    <RNPressable
      ref={ref}
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      onHoverIn={(e) => {
        setHovered(true);
        onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHovered(false);
        onHoverOut?.(e);
      }}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={typeof style === 'function' ? style(state) : style}
    >
      {typeof children === 'function' ? children(state) : children}
    </RNPressable>
  );
});
