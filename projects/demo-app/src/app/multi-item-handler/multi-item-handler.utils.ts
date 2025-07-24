export type OS = 'macos' | 'ios' | 'windows' | 'android' | 'linux';

// Precondition: Should be executed in a Browser environment.
export function ktdGetOS(): OS | null {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const macosPlatforms = /(macintosh|macintel|macppc|mac68k|macos)/i;
    const windowsPlatforms = /(win32|win64|windows|wince)/i;
    const iosPlatforms = /(iphone|ipad|ipod)/i;

    if (macosPlatforms.test(userAgent)) {
        return 'macos';
    } else if (iosPlatforms.test(userAgent)) {
        return 'ios';
    } else if (windowsPlatforms.test(userAgent)) {
        return 'windows';
    } else if (/android/.test(userAgent)) {
        return 'android';
    } else if (/linux/.test(userAgent)) {
        return 'linux';
    }
    return null;
}
