export const fetchApi = async <T = any>(url: string, options?: any): Promise<T> => { return fetch(url, options).then(res => res.json()); };
