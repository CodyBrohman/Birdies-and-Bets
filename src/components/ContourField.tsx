import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import { CONTOUR_PATHS, CONTOUR_VIEWBOX } from './contourPaths';

export interface ContourFieldProps {
  /** Stroke opacity; the brand rule is 6–8%. */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The website's topographic contour motif, static and faint, for behind the Home header, onboarding pages
 * and the share-card header only. Never behind data. Decorative: hidden from accessibility.
 */
export function ContourField({ opacity = 0.07, style }: ContourFieldProps) {
  const { c } = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }, style]}>
      <Svg width="100%" height="100%" viewBox={CONTOUR_VIEWBOX} preserveAspectRatio="xMidYMid slice">
        {CONTOUR_PATHS.map((d, i) => (
          <Path key={i} d={d} stroke={c.accent} strokeOpacity={opacity} strokeWidth={1} fill="none" />
        ))}
      </Svg>
    </View>
  );
}
