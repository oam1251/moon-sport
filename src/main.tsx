import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import StarField from './components/StarField';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StarField />
    <App />
  </React.StrictMode>
);
