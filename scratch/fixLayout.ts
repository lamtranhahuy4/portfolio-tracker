import fs from 'fs';
const file = 'src/components/DashboardClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// Revert the nested grid for NetWorthChart
const oldGrid = `<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <NetWorthChart series={metrics.navSeries} language={language} />
              </div>
              <div className="lg:col-span-1">
                <IRRWidget xirr={metrics.xirr} language={language} />
              </div>
            </div>`;
if (content.includes(oldGrid)) {
  content = content.replace(
    oldGrid,
    `<NetWorthChart series={metrics.navSeries} language={language} />`
  );
} else {
  console.log("Could not find the oldGrid block.");
}

// Add IRRWidget to the aside
const asideTarget = '<aside className="flex flex-col gap-6 lg:col-span-1">';
if (content.includes(asideTarget)) {
  content = content.replace(
    asideTarget,
    `${asideTarget}
            <ErrorBoundary componentName="IRRWidget"><IRRWidget xirr={metrics.xirr} language={language} /></ErrorBoundary>`
  );
} else {
  console.log("Could not find the asideTarget.");
}

fs.writeFileSync(file, content);
