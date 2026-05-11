export const currentPath = (router) => (router?.asPath || '').split('?')[0];
