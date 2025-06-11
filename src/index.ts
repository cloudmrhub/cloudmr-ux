// src/index.ts
export * from './CmrComponents/CmrButton';
export * from './CmrComponents/CmrCheckbox';
export * from './CmrComponents/CmrInput';
export * from './CmrComponents/CmrRadioGroup';
export * from './CmrComponents/CmrSelect';
export { default as CmrCollapse } from './CmrComponents/collapse/Collapse';
export { default as CmrPanel } from './CmrComponents/panel/Panel';

import type { FC } from 'react';
import type { CmrTableProps } from './CmrTable/CmrTable';
import CmrTableComponent from './CmrTable/CmrTable';

export const CmrTable: FC<CmrTableProps> = CmrTableComponent;
export type { CmrTableProps };




