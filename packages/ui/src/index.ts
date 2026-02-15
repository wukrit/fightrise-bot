// Shared UI components for FightRise web portal

export { Button } from './Button.js';
export type { ButtonProps } from './Button.js';

export { DiscordIcon } from './DiscordIcon.js';
export type { DiscordIconProps } from './DiscordIcon.js';

export { UserAvatar } from './UserAvatar.js';
export type { UserAvatarProps } from './UserAvatar.js';

// Form components
export { Input } from './Input.js';
export type { InputProps } from './Input.js';

export { Select } from './Select.js';
export type { SelectProps, SelectOption } from './Select.js';

export { Textarea } from './Textarea.js';
export type { TextareaProps } from './Textarea.js';

// Layout components
export { Badge } from './Badge.js';
export type { BadgeProps, BadgeVariant } from './Badge.js';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card.js';
export type { CardProps, CardHeaderProps, CardTitleProps, CardDescriptionProps, CardContentProps, CardFooterProps } from './Card.js';

export { Modal, ModalContent, ModalFooter } from './Modal.js';
export type { ModalProps, ModalContentProps, ModalFooterProps } from './Modal.js';

export { Drawer, DrawerContent, DrawerFooter } from './Drawer.js';
export type { DrawerProps, DrawerContentProps, DrawerFooterProps } from './Drawer.js';

// Data display
export { Table, Pagination } from './Table.js';
export type { TableProps, Column, PaginationProps } from './Table.js';

// Loading states
export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard, SkeletonTable } from './Skeleton.js';
export type { SkeletonProps, SkeletonTextProps, SkeletonAvatarProps, SkeletonCardProps, SkeletonTableProps } from './Skeleton.js';

// Navigation
export { Header, NavLink, HeaderActions } from './Header.js';
export type { HeaderProps, NavLinkProps, HeaderActionsProps } from './Header.js';

export { Sidebar, SidebarSection, SidebarLink, SidebarToggle } from './Sidebar.js';
export type { SidebarProps, SidebarSectionProps, SidebarLinkProps, SidebarToggleProps } from './Sidebar.js';

export { BottomNav, defaultNavItems } from './BottomNav.js';
export { type BottomNavItem } from './BottomNav.js';

export { Footer, FooterLink } from './Footer.js';
export type { FooterProps, FooterLinkProps } from './Footer.js';

// Feedback
export { Tooltip } from './Tooltip.js';
export type { TooltipProps } from './Tooltip.js';

export { ToastProvider, useToast, toast, setToastFunction } from './Toast.js';
export type { Toast, ToastType, ToastContextValue } from './Toast.js';

// Theme
export { ThemeProvider, ThemeToggle, useTheme } from './ThemeProvider.js';
export type { Theme, ThemeProviderProps, ThemeContextValue, ThemeToggleProps } from './ThemeProvider.js';
