import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { ThunkDispatch } from '@reduxjs/toolkit';
import type { AnyAction } from 'redux';
import type { AuthenticateState } from '../features/authenticate/authenticateSlice';
import { dataSlice } from '../features/data/dataSlice';

// Base state that cloudmr-ux knows about
export interface CloudMRCoreState {
    authenticate: AuthenticateState;
    data: ReturnType<typeof dataSlice.reducer>;
}

// Default hooks for cloudmr-ux components (using base state)
// Apps can override these by importing from their own hooks file
export const useAppDispatch: () => ThunkDispatch<any, undefined, AnyAction> = useDispatch;
export const useAppSelector: TypedUseSelectorHook<any> = useSelector;