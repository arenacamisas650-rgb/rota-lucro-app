import { useEffect } from 'react';
import { appMarkup } from './appMarkup.js';
import { App as RotaLucroApp } from './legacy/app.js';

export default function App() {
  useEffect(() => {
    RotaLucroApp.init();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: appMarkup }} />;
}
