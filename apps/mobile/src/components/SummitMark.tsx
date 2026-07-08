import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../theme/useTheme";

export function SummitMark({ size = 28 }: { size?: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="78" cy="20.5" r="7" fill={colors.accent} />
      <Path d="M12 86.5 L38 39.5 L50 52.5 L66 32.5 L88 86.5 Z" fill={colors.primary} />
    </Svg>
  );
}
