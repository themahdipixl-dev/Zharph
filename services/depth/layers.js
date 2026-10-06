import { Skia } from '@shopify/react-native-skia';

const LAYER_COLORS = [
  '#FF5A5F', '#2DD4BF', '#FACC15', '#60A5FA', '#C084FC',
  '#FB923C', '#4ADE80', '#F472B6', '#38BDF8', '#A3E635',
];

function decodeMask(base64) {
  const data = Skia.Data.fromBase64(base64);
  return Skia.Image.MakeImageFromEncoded(data);
}

export function buildLayerList(result) {
  return (result.layers || [])
    .map((layer, index) => ({
      id: layer.id,
      label: layer.label,
      group: layer.group,
      area: layer.area,
      nearness: layer.nearness,
      color: LAYER_COLORS[index % LAYER_COLORS.length],
      above: false,
      mask: decodeMask(layer.mask),
    }))
    .filter((layer) => layer.mask);
}

export function describeProgress(p) {
  switch (p && p.stage) {
    case 'prepare': return 'Preparing image...';
    case 'seg-download': return 'Downloading object model... ' + (p.pct || 0) + '%';
    case 'segment': return 'Detecting objects...';
    case 'depth-download': return 'Downloading depth model... ' + (p.pct || 0) + '%';
    case 'depth': return 'Estimating depth...';
    case 'refine': return 'Cleaning layer edges...';
    default: return 'Analyzing...';
  }
}