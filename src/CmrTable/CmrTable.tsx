import React from 'react';
import './CmrTable.css';
import { DataGrid, DataGridProps } from '@mui/x-data-grid';
import { CSSProperties } from 'react';

export interface CmrTableProps extends Omit<DataGridProps, 'rows'> {
  dataSource: any[];
  idAlias?: string;
  name?: string;
  style?: CSSProperties;
  showCheckbox?: boolean;
}

const CmrTable: React.FC<CmrTableProps> = (props) => {
  const {
    dataSource,
    columns,
    idAlias,
    className,
    onRowSelectionModelChange,
    style,
    showCheckbox = true,
    ...rest
  } = props;

  return (
    <div style={style ?? { height: '400px', width: '100%' }} className={className ?? ''}>
      <DataGrid
        rows={
          dataSource
            ? dataSource.map((row) => ({
              id: idAlias ? row[idAlias] : row['id'],
              ...row,
            }))
            : []
        }
        columns={columns}
        checkboxSelection={showCheckbox}
        onRowSelectionModelChange={onRowSelectionModelChange}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 50, page: 0 },
          },
        }}
        sx={{
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#F3E5F5',
            color: '#333',
          },
          '& .MuiDataGrid-columnHeaders .MuiSvgIcon-root': {
            color: '#580f8b',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 'bold',
          },
        }}
        localeText={{ noRowsLabel: '' }}
        {...rest}
      />
    </div>
  );
};

export default CmrTable;
