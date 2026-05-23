import { TextElementView } from '@/components/canvas/textElementView';
import { GridElementView } from '@/components/canvas/gridElementView';
import { FieldGroupElementView } from '@/components/canvas/fieldGroupElementView';
import type { TextElement, GridElement, DbData } from '@/utils/canvasUtils';

export type ElementViewProps = {
    el: any;
    selected: boolean;
    dbData: DbData;
    onMouseDown: (e: React.MouseEvent, type: 'move' | 'resize') => void;
    onUpdate: (patch: Partial<any>) => void;
    onStartEdit: () => void;
    onEndEdit: () => void;
}

export function ElementView({ el, selected, dbData, onMouseDown, onUpdate, onStartEdit, onEndEdit }: ElementViewProps) {
    const wrapper: React.CSSProperties = {
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        outline: selected ? '2px solid #2563eb' : 'none',
        cursor: 'move',
        boxSizing: 'border-box',
    };

    let inner: React.ReactNode = null;
    if (el.type === 'text') {
        inner = <TextElementView el={el} dbData={dbData} onUpdate={onUpdate as (p: Partial<TextElement>) => void} onStartEdit={onStartEdit} onEndEdit={onEndEdit} />;
    } else if (el.type === 'grid') {
        inner = <GridElementView el={el} dbData={dbData} onUpdate={onUpdate as (p: Partial<GridElement>) => void} onStartEdit={onStartEdit} onEndEdit={onEndEdit} />;
    } else if (el.type === 'separator') {
        inner = (
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', padding: 0,
            }}>
                <div style={{
                    width: '100%',
                    height: `${el.thickness || 2}px`,
                    background: el.color || '#1044a4',
                }} />
            </div>
        );
    } else if (el.type === 'fieldGroup') {
        inner = <FieldGroupElementView el={el} dbData={dbData} />;
    }

    return (
        <div style={wrapper} onMouseDown={(e) => onMouseDown(e, 'move')}>
            {inner}
            {selected && (
                <div
                    onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'resize'); }}
                    style={{
                        position: 'absolute',
                        right: -6, bottom: -6,
                        width: 12, height: 12,
                        background: '#2563eb',
                        border: '1px solid #fff',
                        cursor: 'nwse-resize',
                        borderRadius: 2,
                    }}
                />
            )}
        </div>
    );
}