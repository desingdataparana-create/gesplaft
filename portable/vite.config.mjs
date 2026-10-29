import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/postcss';
export default defineConfig({root:new URL('.',import.meta.url).pathname,base:'/gesplaft/',plugins:[react()],css:{postcss:{plugins:[tailwind()]}},build:{outDir:'../dist-vps/client',emptyOutDir:true}});
