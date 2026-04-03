# PackRight

This repository contains the project's Node.js environment, where the React/Vite app can be built and run.

First, place these contents into a file named `.env` inside the folder `packing-hci`:
```
VITE_SUPABASE_URL=https://uigzlwdhgumwtarzgpmo.supabase.co/
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZ3psd2RoZ3Vtd3RhcnpncG1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDc2MjEsImV4cCI6MjA4NzAyMzYyMX0.4AN2NynukeqbET3JetFN9rwLjUIaM_dcUuqR9Aj9TYk
```

Next, run these commands in the root folder:
```
cd packing-hci
npm install
npm run host
```

Finally, open http://localhost:5173 on a browser to use the desktop interface. To use it on a mobile device connected to the same network, go to the URL given on the command line listed **Network**.