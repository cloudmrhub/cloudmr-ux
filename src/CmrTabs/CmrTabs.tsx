import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { TabInfo } from "./tab.model";
import { cloneElement } from "react";

interface CmrTabsProps {
    tabList: TabInfo[];
    onTabSelected?: (tabId: number) => void;

    tabIndicatorColor?: string;
    tabSelectedTextColor?: string;
}

interface TabPanelProps {
    index: number;
    value: number;
    children: JSX.Element;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            <Box sx={{ p: 0 }} style={{ display: (value === index ? undefined : 'none') }}>
                {children}
            </Box>
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

export default function CmrTabs(props: CmrTabsProps) {
    const [value, setValue] = React.useState(0);

    const tabIndicatorColor = props.tabIndicatorColor ?? "#580F8B";
    const tabSelectedTextColor = props.tabSelectedTextColor ?? "#580F8B";

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
        if (props.onTabSelected)
            props.onTabSelected(newValue);
    };

    // console.log(props.tabList);
    return (
        <Container maxWidth="lg"
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                mt: 4
            }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
                <Tabs value={value} onChange={handleChange} aria-label="basic tabs example"
                    textColor='inherit'
                    TabIndicatorProps={{
                        style: {
                            backgroundColor: tabIndicatorColor,
                        }
                    }}>
                    {props.tabList.map((tab, index) =>
                        <Tab key={index} sx={{ color: (value == index) ? tabSelectedTextColor : undefined }} style={{ fontSize: '14px', textTransform: 'uppercase', fontWeight: 400 }} label={tab.text} {...a11yProps(index)} />)}
                </Tabs>
            </Box>
            {props.tabList.map((tab, index) =>
                <CustomTabPanel key={index} value={value} index={index}>
                    {cloneElement(tab.children, {
                        visible: value == index
                    })}
                </CustomTabPanel>
            )}
        </Container>
    );
}