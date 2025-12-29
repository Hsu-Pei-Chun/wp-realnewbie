interface MenuItem {
  label: string;
  href: string;
}

export const mainMenu: MenuItem[] = [
  { label: "首頁", href: "/" },
  { label: "關於我", href: "/pages/about-me" },
  { label: "部落格", href: "/posts" },
];

export const contentMenu: MenuItem[] = [
  { label: "分類", href: "/posts/categories" },
  { label: "系列文", href: "/posts/tags" },
];
