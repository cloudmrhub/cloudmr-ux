import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { authenticateSlice } from '../features/authenticate/authenticateSlice';
import { dataSlice } from '../features/data/dataSlice';

// This will be called by the app to create the store with app-specific configuration
export function createCloudMRStore(additionalReducers: any = {}) {
    
    const rootReducer = combineReducers({
        authenticate: authenticateSlice.reducer,
        data: dataSlice.reducer,
        ...additionalReducers
    });

    const persistConfig = {
        key: 'root',
        storage,
    };

    const persistedReducer = persistReducer(persistConfig, rootReducer);

    const store = configureStore({
        reducer: persistedReducer,
        middleware: (getDefaultMiddleware: any) =>
            getDefaultMiddleware({
                serializableCheck: {
                    ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
                },
            }),
    });

    const persistor = persistStore(store);

    return { store, persistor };
}

// Types for the store
export type RootState = ReturnType<ReturnType<typeof createCloudMRStore>['store']['getState']>;
export type AppDispatch = ReturnType<typeof createCloudMRStore>['store']['dispatch'];