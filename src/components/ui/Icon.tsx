import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Every icon the app uses, by meaning. SF Symbols on iOS (SF Symbols 4 names, so iOS 16 works); Ionicons stand in on
 * the web preview and in tests. `filled` is the selected form (tab bar).
 */
const ICONS = {
  home: { sf: 'house', sfFilled: 'house.fill', ion: 'home-outline', ionFilled: 'home' },
  courses: { sf: 'map', sfFilled: 'map.fill', ion: 'map-outline', ionFilled: 'map' },
  play: { sf: 'figure.golf', sfFilled: 'figure.golf', ion: 'golf-outline', ionFilled: 'golf' },
  friends: { sf: 'person.2', sfFilled: 'person.2.fill', ion: 'people-outline', ionFilled: 'people' },
  profile: { sf: 'person.crop.circle', sfFilled: 'person.crop.circle.fill', ion: 'person-circle-outline', ionFilled: 'person-circle' },
  chevronRight: { sf: 'chevron.right', ion: 'chevron-forward' },
  chevronLeft: { sf: 'chevron.left', ion: 'chevron-back' },
  chevronDown: { sf: 'chevron.down', ion: 'chevron-down' },
  plus: { sf: 'plus', ion: 'add' },
  minus: { sf: 'minus', ion: 'remove' },
  check: { sf: 'checkmark', ion: 'checkmark' },
  close: { sf: 'xmark', ion: 'close' },
  share: { sf: 'square.and.arrow.up', ion: 'share-outline' },
  note: { sf: 'note.text', ion: 'document-text-outline' },
  standings: { sf: 'list.number', ion: 'list-outline' },
  trophy: { sf: 'trophy', sfFilled: 'trophy.fill', ion: 'trophy-outline', ionFilled: 'trophy' },
  more: { sf: 'ellipsis.circle', ion: 'ellipsis-horizontal-circle-outline' },
  undo: { sf: 'arrow.uturn.backward', ion: 'arrow-undo-outline' },
  trash: { sf: 'trash', ion: 'trash-outline' },
  edit: { sf: 'pencil', ion: 'create-outline' },
  search: { sf: 'magnifyingglass', ion: 'search' },
  calendar: { sf: 'calendar', ion: 'calendar-outline' },
  clock: { sf: 'clock', ion: 'time-outline' },
  flag: { sf: 'flag', sfFilled: 'flag.fill', ion: 'flag-outline', ionFilled: 'flag' },
  location: { sf: 'mappin.and.ellipse', ion: 'location-outline' },
  person: { sf: 'person', ion: 'person-outline' },
  personAdd: { sf: 'person.badge.plus', ion: 'person-add-outline' },
  settings: { sf: 'gearshape', ion: 'settings-outline' },
  info: { sf: 'info.circle', ion: 'information-circle-outline' },
  warning: { sf: 'exclamationmark.triangle', ion: 'warning-outline' },
  offline: { sf: 'wifi.slash', ion: 'cloud-offline-outline' },
  external: { sf: 'arrow.up.right', ion: 'open-outline' },
  star: { sf: 'star', sfFilled: 'star.fill', ion: 'star-outline', ionFilled: 'star' },
  camera: { sf: 'camera', ion: 'camera-outline' },
  sync: { sf: 'arrow.triangle.2.circlepath', ion: 'sync-outline' },
} as const satisfies Record<string, { sf: SFSymbol; sfFilled?: SFSymbol; ion: IoniconName; ionFilled?: IoniconName }>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  /** 'sm' 20pt (inline with text), 'md' 24pt (default, in rows and buttons), or a size for tab and hero glyphs. */
  size?: 'sm' | 'md' | number;
  color?: string;
  /** The selected form (tab bar). */
  filled?: boolean;
  /**
   * Only for an icon that carries meaning on its own (no text next to it). Without it the icon is decorative and
   * hidden from VoiceOver, which is right whenever a label sits beside it.
   */
  accessibilityLabel?: string;
}

export function Icon({ name, size = 'md', color, filled, accessibilityLabel }: IconProps) {
  const { c, hit } = useTheme();
  const px = size === 'sm' ? hit.iconSm : size === 'md' ? hit.iconMd : size;
  const spec = ICONS[name] as { sf: SFSymbol; sfFilled?: SFSymbol; ion: IoniconName; ionFilled?: IoniconName };
  const tint = color ?? c.textPrimary;
  const a11y = accessibilityLabel
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <SymbolView
      name={(filled && spec.sfFilled) || spec.sf}
      size={px}
      tintColor={tint}
      weight="medium"
      fallback={<Ionicons name={(filled && spec.ionFilled) || spec.ion} size={px} color={tint} {...a11y} />}
      {...a11y}
    />
  );
}
