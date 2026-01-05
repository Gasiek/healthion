import {
    Gauge,
    Heart,
    Activity,
    Moon,
    Footprints,
    Zap,
    Scale,
    Settings,
    LucideIcon
} from 'lucide-react'

type MenuItemType = {
    title: string
    url: string
    external?: string
    icon?: LucideIcon
    items?: MenuItemType[]
}
type MenuType = MenuItemType[]

export const mainMenu: MenuType = [
    {
        title: 'Dashboard',
        url: '/',
        icon: Gauge
    },
    {
        title: 'Heart Rate',
        url: '/heart-rate',
        icon: Heart
    },
    {
        title: 'Workouts',
        url: '/workouts',
        icon: Activity
    },
    {
        title: 'Sleep',
        url: '/sleep',
        icon: Moon
    },
    {
        title: 'Activity',
        url: '/activity',
        icon: Footprints
    },
    {
        title: 'Recovery',
        url: '/recovery',
        icon: Zap
    },
    {
        title: 'Body',
        url: '/body',
        icon: Scale
    },
    {
        title: 'Settings',
        url: '/settings',
        icon: Settings
    },
]
