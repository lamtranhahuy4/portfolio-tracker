import fs from 'fs';
const file = 'src/components/DashboardClient.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import IRRWidget from')) {
  content = content.replace(
    'import NetWorthChart from',
    'import IRRWidget from \'@/components/widgets/IRRWidget\';\nimport NetWorthChart from'
  );

  // We want to add it somewhere in the UI, maybe near the top metrics.
  // Let's find a good spot.
  const target = '<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">';
  if (content.includes(target)) {
    content = content.replace(
      target,
      `<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <IRRWidget xirr={metrics.xirr} language={language} />`
    );
  } else {
    // alternative spot
    content = content.replace(
      '<NetWorthChart series={metrics.navSeries} language={language} />',
      '<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">\n              <div className="lg:col-span-2">\n                <NetWorthChart series={metrics.navSeries} language={language} />\n              </div>\n              <div className="lg:col-span-1">\n                <IRRWidget xirr={metrics.xirr} language={language} />\n              </div>\n            </div>'
    );
  }
  
  fs.writeFileSync(file, content);
}
