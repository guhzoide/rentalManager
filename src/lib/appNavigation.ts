export function resolveAppRoute(pathname: string, authenticated: boolean) {
    if (pathname === '/deploy') return '/deploy';
    if (pathname === '/login' || pathname === '/menu') return authenticated ? '/menu' : '/login';
    return '/';
}

export function sessionScope(session: { user: { id: string }; session: { id: string } } | null | undefined) {
    return session ? `${session.user.id}:${session.session.id}` : 'anonymous';
}

export function permittedTabs<T extends { id: string }>(tabs: T[], pages: Set<string>, modules: Record<string, unknown>) {
    return tabs.filter((tab) => pages.has(tab.id) && Object.prototype.hasOwnProperty.call(modules, tab.id));
}
