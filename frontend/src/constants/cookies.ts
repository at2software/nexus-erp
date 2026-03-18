
export const getCookie = (name: string) => {
    const ca: string[] = document.cookie.split(';');
    const caLen: number = ca.length;
    const cookieName = `${name}=`;
    let c: string;

    for (let i: number = 0; i < caLen; i += 1) {
        c = ca[i].replace(/^\s+/g, '');
        if (c.indexOf(cookieName) == 0) {
            return c.substring(cookieName.length, c.length);
        }
    }
    return '';
}

export const deleteCookie = (name:string)  => {
    setCookie(name, '', -1);
}

export const setCookie = (name: string, value: string, expireDays: number, path: string = '/') => {
    const d:Date = new Date();
    d.setTime(d.getTime() + expireDays * 24 * 60 * 60 * 1000);
    const expires:string = `expires=${d.toUTCString()}`;
    const cpath:string = path ? `; path=${path}` : '';
    const secure = location.protocol === 'https:' ? '; SameSite=None; Secure' : '; SameSite=Lax';
    document.cookie = `${name}=${value}; ${expires}${cpath}${secure}`;
}