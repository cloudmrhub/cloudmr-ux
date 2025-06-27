// src/index.ts
export * from './CmrComponents/CmrButton';
export * from './CmrComponents/CmrCheckbox';
export * from './CmrComponents/CmrInput';
export * from './CmrComponents/CmrRadioGroup';
export * from './CmrComponents/CmrSelect';
export { default as CmrCollapse } from './CmrComponents/collapse/Collapse';
export { default as CmrPanel } from './CmrComponents/panel/Panel';
export { default as CMRUpload } from './CmrComponents/upload/Upload';
export { default as CmrNameDialog } from './CmrComponents/rename/edit';
export { default as CmrConfirmation } from './CmrComponents/dialogue/Confirmation';
export { default as CmrDeletionDialog } from './CmrComponents/dialogue/DeletionDialog';
export { default as CmrEditConfirmation } from './CmrComponents/dialogue/EditConfirmation';
export { default as CmrTabs } from './CmrTabs/CmrTabs';
export { default as CmrCheckbox } from './CmrComponents/checkbox/Checkbox';
export { default as CmrLabel } from './CmrComponents/label/Label';
export { default as CmrButton } from './CmrComponents/CmrButton/CmrButton';
export { default as CmrInputNumber } from './CmrComponents/input-number/InputNumber';
export type { LambdaFile } from './CmrComponents/upload/Upload';


import type { FC } from 'react';
import type { CmrTableProps } from './CmrTable/CmrTable';
import CmrTableComponent from './CmrTable/CmrTable';

export const CmrTable: FC<CmrTableProps> = CmrTableComponent;
export type { CmrTableProps };





