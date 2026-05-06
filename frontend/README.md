# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Centralized API Service

Use [`src/services/api.js`](./src/services/api.js) for all network calls. It standardizes:
- Timeout and abort handling
- JSON/text response parsing
- HTTP/network error normalization through `ApiError`
- Common methods (`api.get`, `api.post`, `api.put`, `api.patch`, `api.delete`)

Example:

```js
import { api, ApiError } from '../services/api'; // from src/components/*

try {
  const data = await api.get('/api/health', { baseUrl: 'https://example.com' });
  console.log(data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.code, error.status, error.message, error.data);
  } else {
    console.error(error);
  }
}
```
