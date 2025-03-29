import React from 'react';

interface QuotationPDFProps {
  meters: any[];
  terraAIOptIn: boolean;
  terraEdgeRequired: boolean;
  terraEdgePayment: 'monthly' | 'one-time';
  terraEdgeQuantity: number;
  services: any[];
  monthlyMeterCost: number;
  edgeCostMonthly: number;
  edgeCostOneTime: number;
  serviceCostOneTime: number;
  totalMonthlyCost: number;
  totalOneTimeCost: number;
}

const QuotationPDF: React.FC<QuotationPDFProps> = ({
  meters,
  terraAIOptIn,
  terraEdgeRequired,
  terraEdgePayment,
  terraEdgeQuantity,
  services,
  monthlyMeterCost,
  edgeCostMonthly,
  edgeCostOneTime,
  serviceCostOneTime,
  totalMonthlyCost,
  totalOneTimeCost,
}) => {
  return (
    <div className="pdf-container p-8 bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-blue-700">TerraEMS Quotation</h1>
        <p className="text-gray-600 mt-2">Bhuj, Gujarat, India Pricing (INR)</p>
        <p className="text-sm text-gray-500 mt-1">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Configuration Summary</h2>
        
        {/* Energy Meters */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-gray-700">Energy Meters</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Meter Type</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Quantity</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Rate (₹)</th>
              </tr>
            </thead>
            <tbody>
              {meters.filter(m => m.quantity > 0).map((meter, index) => (
                <tr key={meter.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-4 py-2">{meter.name}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{meter.quantity}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {terraAIOptIn ? meter.rateWithAI : meter.rateNoAI} per month
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* TerraAI */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-gray-700">TerraAI</h3>
          <p className="pl-4">TerraAI Opted: <span className="font-medium">{terraAIOptIn ? "Yes" : "No"}</span></p>
          <p className="pl-4 text-sm text-gray-600">
            Scan Rate: {terraAIOptIn
              ? "Rates per month for above 1 min scan rates if opted for TerraAI"
              : "Rates per month for above 1 min scan rates if not opted for TerraAI"}
          </p>
        </div>
        
        {/* TerraEdge */}
        {terraEdgeRequired && (
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2 text-gray-700">TerraEdge Device</h3>
            <p className="pl-4">Quantity: <span className="font-medium">{terraEdgeQuantity}</span></p>
            <p className="pl-4">Payment Option: <span className="font-medium">{terraEdgePayment === 'monthly' ? "Monthly (₹100/month)" : "One-Time (₹3000)"}</span></p>
          </div>
        )}
        
        {/* Services */}
        {services.some(s => s.selected) && (
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2 text-gray-700">Selected Services</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Service</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Quantity</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                {services.filter(s => s.selected).map((service, index) => {
                  let cost = 0;
                  let displayQuantity = service.quantity ?? 1;
                  if (service.id === 's1') cost = service.rate * displayQuantity;
                  else if (service.id === 's2' && terraAIOptIn) cost = Math.max(service.rate * displayQuantity, service.minimum ?? 0);
                  else if (service.id === 's3') cost = Math.max(service.rate * displayQuantity, service.minimum ?? 0);
                  
                  return cost > 0 ? (
                    <tr key={service.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{service.name}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {(service.id === 's1' || service.id === 's2' || service.id === 's3') ? displayQuantity : '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {cost.toFixed(2)}
                        {service.minimum && cost === service.minimum && service.rate * displayQuantity < service.minimum && 
                          <span className="text-xs ml-1">(Minimum applied)</span>
                        }
                      </td>
                    </tr>
                  ) : null;
                }).filter(Boolean)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Cost Summary</h2>
        
        {/* Monthly Costs */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-gray-700">Monthly Costs</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Item</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2">Energy Meters</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{monthlyMeterCost.toFixed(2)}</td>
              </tr>
              {terraEdgeRequired && terraEdgePayment === 'monthly' && (
                <tr className="bg-gray-50">
                                    <td className="border border-gray-300 px-4 py-2">
                    TerraEdge Device ({terraEdgeQuantity} unit{terraEdgeQuantity > 1 ? 's' : ''})
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{edgeCostMonthly.toFixed(2)}</td>
                </tr>
              )}
              <tr className="bg-blue-50 font-bold">
                <td className="border border-gray-300 px-4 py-2">Total Monthly</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{totalMonthlyCost.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* One-Time Costs */}
        <div>
          <h3 className="text-lg font-medium mb-3 text-gray-700">One-Time Costs</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Item</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {terraEdgeRequired && terraEdgePayment === 'one-time' && (
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-2">
                    TerraEdge Device ({terraEdgeQuantity} unit{terraEdgeQuantity > 1 ? 's' : ''})
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{edgeCostOneTime.toFixed(2)}</td>
                </tr>
              )}
              
              {services.filter(s => s.selected).map((service, index) => {
                let cost = 0;
                let displayQuantity = service.quantity ?? 1;
                if (service.id === 's1') cost = service.rate * displayQuantity;
                else if (service.id === 's2' && terraAIOptIn) cost = Math.max(service.rate * displayQuantity, service.minimum ?? 0);
                else if (service.id === 's3') cost = Math.max(service.rate * displayQuantity, service.minimum ?? 0);
                
                return cost > 0 ? (
                  <tr key={service.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-2">
                      {service.name} {(service.id === 's1' || service.id === 's2' || service.id === 's3') ? `(Qty: ${displayQuantity})` : ''}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{cost.toFixed(2)}</td>
                  </tr>
                ) : null;
              }).filter(Boolean)}
              
              <tr className="bg-blue-50 font-bold">
                <td className="border border-gray-300 px-4 py-2">Total One-Time</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{totalOneTimeCost.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">This quotation is valid for 30 days from the date of generation.</p>
        <p className="text-sm text-gray-500">For any queries, please contact us at info@terraems.com</p>
      </div>
    </div>
  );
};

export default QuotationPDF;
