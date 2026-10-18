import { registerRootComponent } from 'expo';

// Primero: define la tarea de ubicación en segundo plano (TaskManager exige hacerlo al cargar la app).
import './src/ubicacion';
import App from './App';

registerRootComponent(App);
