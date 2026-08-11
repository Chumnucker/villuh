import { CentralIcon, CentralIconBaseProps } from "@central-icons-react/all"
import {
  CentralIconFill,
  CentralIconJoin,
  CentralIconName,
  CentralIconRadius,
  CentralIconStroke,
} from "@central-icons-react/all/icons"

export type PlatformIconName = CentralIconName
export type PlatformIconProps = CentralIconBaseProps & {
  icon: PlatformIconName
  join?: CentralIconJoin
  fill?: CentralIconFill
  radius?: CentralIconRadius
  stroke?: CentralIconStroke
}
export const PlatformIcon = ({
  icon,
  stroke = "1",
  fill = "outlined",
  join = "square",
  radius = "0",
  ...props
}: PlatformIconProps) => {
  return (
    <CentralIcon
      name={icon as any}
      stroke={"1.5"}
      fill={fill}
      join={join}
      radius={radius}
      {...props}
    />
  )
}
