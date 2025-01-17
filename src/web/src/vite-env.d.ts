/// <reference types="vite/client" />

// Environment variable type declarations
interface ImportMetaEnv {
  // Application configuration
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_BASE_URL: string;

  // Microsoft Teams integration
  readonly VITE_TEAMS_CLIENT_ID: string;

  // Azure AD configuration 
  readonly VITE_AAD_CLIENT_ID: string;
  readonly VITE_AAD_AUTHORITY: string;
  readonly VITE_AAD_REDIRECT_URI: string;

  // Vite environment flags
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly BASE_URL: string;
}

// Extend ImportMeta interface
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Static asset type declarations
declare module '*.svg' {
  import React from 'react';
  const SVGComponent: React.FunctionComponent<React.SVGProps<SVGElement>>;
  export default SVGComponent;
}

// Image asset types
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

// Style asset types
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.scss' {
  const content: string;
  export default content;
}

// Font asset types
declare module '*.woff' {
  const content: string;
  export default content;
}

declare module '*.woff2' {
  const content: string;
  export default content;
}