import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../src/App';
import '../src/index.css';
import {applyRememberedBrand} from '../src/brand';
applyRememberedBrand();
createRoot(document.getElementById('root')!).render(<App/>);
