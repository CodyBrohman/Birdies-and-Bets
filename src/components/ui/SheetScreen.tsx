import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '@/theme';
import { HeaderButton } from './HeaderButton';
import { Text } from './Text';

export interface SheetScreenProps {
  title: string;
  /** Closes the sheet: a leading "Cancel" (with an `action`, or a picker that closes on choosing), or a bold trailing "Done". */
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
 *
 * The scroll view is the sheet's only view and the bar is its sticky first child. react-native-screens sizes a form
 * sheet's scroll view to the whole sheet, and on Fabric places it at the top, so a bar beside it (instead of inside it)
 * ended up under the content on iOS.
 */
export function SheetScreen({ title, onClose, closeLabel, action, gap, children }: SheetScreenProps) {
  const { c, space, layout } = useTheme();
  const label = closeLabel ?? (action ? 'Cancel' : 'Done');
  // As in iOS: Cancel leads; Done trails, in bold.
  const leading = !!action || label !== 'Done';
  const close = <HeaderButton label={label} prominent={!leading} onPress={onClose} testID="sheet-close" />;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      stickyHeaderIndices={[0]}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: layout.section }}
    >
      {/* A sticky child's own style moves to React Native's sticky wrapper (and the child gets flex: 1), so the row lives
          one level in. */}
      <View collapsable={false} style={{ backgroundColor: c.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: space[3], paddingTop: space[2] }}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>{leading ? close : null}</View>
          <Text accessibilityRole="header" step="rowTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>{action ? <HeaderButton label={action.label} prominent disabled={action.disabled} onPress={action.onPress} testID={action.testID} /> : leading ? null : close}</View>
        </View>
      </View>
      <View style={{ paddingHorizontal: layout.cardPad + 4, paddingTop: space[2], gap: gap ?? space[4] }}>{children}</View>
    </ScrollView>
  );
}
