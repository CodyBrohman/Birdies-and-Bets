import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '@/theme';
import { HeaderButton } from './HeaderButton';
import { Text } from './Text';

export interface SheetScreenProps {
  title: string;
  /** Closes the sheet. With an `action` it is the leading "Cancel"; without one it is a bold trailing "Done". */
  onClose: () => void;
  closeLabel?: string;
  /** The trailing action that completes the sheet ("Save", "Add"). */
  action?: { label: string; onPress: () => void; disabled?: boolean; testID?: string };
  /** Space between the direct children. */
  gap?: number;
  children: ReactNode;
}

/**
 * The inside of a form-sheet route (the route's options set the sheet presentation): the bar across the top, as in
 * iOS sheets (Cancel · title · Save, or title · Done for a sheet that only shows things), then scrolling content
 * that clears the keyboard.
 */
export function SheetScreen({ title, onClose, closeLabel, action, gap, children }: SheetScreenProps) {
  const { c, space, layout } = useTheme();
  const close = <HeaderButton label={closeLabel ?? (action ? 'Cancel' : 'Done')} prominent={!action} onPress={onClose} testID="sheet-close" />;
  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: space[3], paddingTop: space[2] }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>{action ? close : null}</View>
        <Text accessibilityRole="header" step="rowTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
          {title}
        </Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>{action ? <HeaderButton label={action.label} prominent disabled={action.disabled} onPress={action.onPress} testID={action.testID} /> : close}</View>
      </View>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: layout.cardPad + 4, paddingTop: space[2], paddingBottom: layout.section, gap: gap ?? space[4] }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
