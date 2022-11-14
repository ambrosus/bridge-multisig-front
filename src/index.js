import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { providers } from 'ethers';
import { Web3ReactProvider } from '@web3-react/core';

const getLibrary = (provider = null) => new providers.Web3Provider(provider);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Web3ReactProvider getLibrary={getLibrary}>
      <App />
    </Web3ReactProvider>
  </React.StrictMode>
);
