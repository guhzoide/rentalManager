import { useId, type ReactNode } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface SystemAccordionProps {
    title: ReactNode;
    children: ReactNode;
    subtitle?: ReactNode;
    defaultExpanded?: boolean;
    className?: string;
    id?: string;
    contentPadding?: number | string;
}

export function SystemAccordion({
    title,
    children,
    subtitle,
    defaultExpanded = false,
    className,
    id,
    contentPadding = 16,
}: SystemAccordionProps) {
    const generatedId = useId().replace(/:/g, '');
    const accordionId = id ?? `system-accordion-${generatedId}`;

    return (
        <Accordion
            defaultExpanded={defaultExpanded}
            disableGutters
            className={className}
            sx={{
                margin: 0,
                overflow: 'hidden',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg) !important',
                boxShadow: 'var(--shadow-sm)',
                '&::before': { display: 'none' },
                '&.Mui-expanded': {
                    margin: 0,
                    borderColor: 'var(--border-focus)',
                    boxShadow: 'var(--shadow-md)',
                },
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`${accordionId}-content`}
                id={`${accordionId}-header`}
                sx={{
                    minHeight: 52,
                    paddingInline: 2,
                    backgroundColor: 'var(--bg-card)',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { backgroundColor: 'var(--bg-hover)' },
                    '&.Mui-focusVisible': { backgroundColor: 'var(--accent-light)' },
                    '& .MuiAccordionSummary-content': {
                        minWidth: 0,
                        margin: '12px 0',
                    },
                    '& .MuiAccordionSummary-expandIconWrapper': {
                        color: 'var(--accent)',
                    },
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{title}</div>
                    {subtitle && (
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                            {subtitle}
                        </div>
                    )}
                </div>
            </AccordionSummary>
            <AccordionDetails
                id={`${accordionId}-content`}
                aria-labelledby={`${accordionId}-header`}
                sx={{
                    padding: contentPadding,
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border)',
                    heigth: '10px'
                    
                }}
            >
                {children}
            </AccordionDetails>
        </Accordion>
    );
}
