import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { PRESSED_OPACITY, useTheme } from '@/theme';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { Icon } from './Icon';
import { Switch } from './Switch';
import { actionSheet } from './confirm';

export interface ListSectionProps {
  header?: string;
  /** 'compact' (default): a small grey header, as in a form. 'large': a section title inside a screen. */
  headerVariant?: 'compact' | 'large';
  /** A trailing control on the header line (e.g. "See all"). */
  headerAction?: { label: string; onPress: () => void };
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** An iOS inset-grouped section: optional header, white rows separated by hairlines, optional footer. */
export function ListSection({ header, headerVariant = 'compact', headerAction, footer, children, style }: ListSectionProps) {
  const { c, w, space } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<{ first?: boolean }>[];
  return (
    <View style={[{ gap: space[2] }, style]}>
      {header || headerAction ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[3], paddingHorizontal: headerVariant === 'compact' ? space[4] : 0 }}>
          {header ? (
            <Text accessibilityRole="header" step={headerVariant === 'large' ? 'title3' : 'footnote'} tone={headerVariant === 'large' ? 'primary' : 'secondary'} style={{ flex: 1, fontWeight: w.semibold }}>
              {header}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {headerAction ? (
            <Pressable accessibilityRole="button" accessibilityLabel={headerAction.label} onPress={headerAction.onPress} hitSlop={12} style={({ pressed }) => ({ minHeight: 32, justifyContent: 'flex-end', opacity: pressed ? PRESSED_OPACITY : 1 })}>
              <Text step="subhead" tone="accent" style={{ fontWeight: w.semibold }}>
                {headerAction.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={{ backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
        {rows.map((row, i) => cloneElement(row, { first: i === 0 }))}
      </View>
      {footer ? (
        <Text step="footnote" tone="tertiary" style={{ paddingHorizontal: space[4] }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export interface ListMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export type ListAccessory = 'chevron' | 'check' | 'none' | { switch: boolean; onChange: (value: boolean) => void };

export interface ListItemProps {
  title: string;
  /** A bold title (people, courses, rounds); plain body text for settings rows. */
  strong?: boolean;
  subtitle?: string;
  subtitleLines?: number;
  /** Right-aligned value ("Cedar Ridge", "100%"). */
  value?: string;
  /** Avatar or icon before the text. */
  leading?: ReactNode;
  /** Trailing content in place of a value (e.g. a score). Sits inside the press area; never a button. */
  trailing?: ReactNode;
  /** 'chevron' drills in, 'check' marks the chosen row, a switch is its own control. Default: chevron when tappable. */
  accessory?: ListAccessory;
  /** Coral text: a destructive row ("Delete account"). */
  destructive?: boolean;
  onPress?: () => void;
  /** Long-press actions in a native action sheet; VoiceOver offers the same as custom actions. */
  menu?: ListMenuItem[];
  menuTitle?: string;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  /** Set by ListSection: the first row has no hairline above it. */
  first?: boolean;
}

/** One row in a ListSection. 44pt minimum (grows with Dynamic Type). */
export function ListItem({ title, strong, subtitle, subtitleLines = 2, value, leading, trailing, accessory, destructive, onPress, menu, menuTitle, disabled, selected, accessibilityLabel, accessibilityHint, testID, first }: ListItemProps) {
  const { c, space } = useTheme();
  const isSwitch = typeof accessory === 'object' && accessory !== null && 'switch' in accessory;
  const tappable = !!onPress && !isSwitch;
  const shown = accessory ?? (tappable && !destructive ? 'chevron' : 'none');
  const openMenu = async () => {
    if (!menu?.length) return;
    const i = await actionSheet(menuTitle ?? title, menu);
    if (i != null) menu[i]?.onPress();
  };

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44, paddingVertical: space[3], paddingRight: space[4] }}>
      {leading}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text step={strong ? 'rowTitle' : 'rowBody'} style={destructive ? { color: c.destructive } : undefined} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text step="subhead" tone="secondary" numberOfLines={subtitleLines}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text step="rowBody" tone="secondary" numberOfLines={1} style={{ flexShrink: 1, maxWidth: '55%' }}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {shown === 'chevron' ? <Icon name="chevronRight" size={14} color={c.textTertiary} /> : null}
      {shown === 'check' ? <Icon name="check" size="sm" color={c.accent} /> : null}
      {isSwitch ? <Switch value={accessory.switch} onChange={accessory.onChange} accessibilityLabel={accessibilityLabel ?? title} disabled={disabled} /> : null}
    </View>
  );

  return (
    <View style={{ paddingLeft: space[4], opacity: disabled ? 0.4 : 1 }}>
      {!first ? <View style={{ height: 1, backgroundColor: c.divider }} /> : null}
      {tappable || menu?.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: !!disabled, selected: !!selected || shown === 'check' }}
          accessibilityActions={menu?.map((m) => ({ name: m.label, label: m.label }))}
          onAccessibilityAction={(e) => menu?.find((m) => m.label === e.nativeEvent.actionName)?.onPress()}
          disabled={disabled}
          onPress={onPress}
          onLongPress={menu?.length ? () => void openMenu() : undefined}
          testID={testID}
          style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
        >
          {content}
        </Pressable>
      ) : (
        <View accessible={!isSwitch} accessibilityLabel={isSwitch ? undefined : accessibilityLabel} testID={testID}>
          {content}
        </View>
      )}
    </View>
  );
}
