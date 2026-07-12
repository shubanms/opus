import React from 'react';
import { QuickStartWidget } from './widgets/QuickStartWidget';

export async function widgetTaskHandler(props) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<QuickStartWidget />);
      break;
    default:
      break;
  }
}
