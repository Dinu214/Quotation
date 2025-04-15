import React, { useState, useEffect } from 'react';
import './index.css'; // Ensure Tailwind styles are imported
import { 
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, 
  TableRow, TableCell, BorderStyle, AlignmentType, WidthType,
  Header, Footer, ImageRun, Tab
} from 'docx';
import { saveAs } from 'file-saver';
import { Button } from './components/Button';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { getPricingConfig } from './services/pricingService';
import Toast from './components/Toast';

// Define interfaces for clarity
interface MeterConfig {
  id: string;
  name: string;
  rateNoAI: number;
  rateWithAI: number;
  quantity: number;
}

interface ServiceConfig {
  id: string;
  name: string;
  rate: number;
  unit?: string; // e.g., 'per page', 'per component'
  minimum?: number;
  selected: boolean;
  quantity?: number; // For services like mimics pages
}

const App: React.FC = () => {
  // --- State Variables ---
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'info'
  });

  // Check for existing admin session on component mount
  useEffect(() => {
    const adminSession = localStorage.getItem('terraems_admin_session');
    if (adminSession === 'true') {
      setIsAdminLoggedIn(true);
    }
  }, []);

  // Energy Meters
  const [meters, setMeters] = useState<MeterConfig[]>([
    { id: 'm1', name: 'Single phase energy meter KWH only', rateNoAI: 10, rateWithAI: 20, quantity: 0 },
    { id: 'm2', name: 'Single phase energy meter kwh, KW, V, I, pf', rateNoAI: 20, rateWithAI: 40, quantity: 0 },
    { id: 'm3', name: '3 phase energy meter KWH, KW, V, I, Ph', rateNoAI: 30, rateWithAI: 60, quantity: 0 },
    { id: 'm4', name: '3 phase energy meter KWH, KW, V, I, KVAr, harmonics', rateNoAI: 60, rateWithAI: 120, quantity: 0 },
  ]);

  // TerraAI Opt-in
  const [terraAIOptIn, setTerraAIOptIn] = useState<boolean>(false);

  // Scan Rate (Implicitly determined by terraAIOptIn for meter pricing)

  // TerraEdge Device
  const [terraEdgeRequired, setTerraEdgeRequired] = useState<boolean>(false);
  const [terraEdgePayment, setTerraEdgePayment] = useState<'monthly' | 'one-time'>('monthly'); // Default to monthly
  const [terraEdgeQuantity, setTerraEdgeQuantity] = useState<number>(1); // Added state for quantity
  const [pricingReloadTrigger, setPricingReloadTrigger] = useState<number>(0);

  // Service Charges
  const [services, setServices] = useState<ServiceConfig[]>([
    { id: 's1', name: 'Mimics pages - SLD, electrical component, energy flows etc', rate: 2000, unit: 'per page', selected: false, quantity: 1 },
    { id: 's2', name: 'AI Philosophy for TerraAI', rate: 2000, unit: 'per component', minimum: 150000, selected: false, quantity: 1 }, // Assuming 'per component' needs a quantity, defaulting to 1 for calculation base if selected
    { id: 's3', name: 'Initialization, Dashboards, Installation, alarms & commissioning', rate: 1000, unit: 'per component', minimum: 100000, selected: false, quantity: 1 }, // Assuming 'per component' needs a quantity
  ]);

  // Calculated Costs
  const [monthlyMeterCost, setMonthlyMeterCost] = useState<number>(0);
  const [edgeCostMonthly, setEdgeCostMonthly] = useState<number>(0);
  const [edgeCostOneTime, setEdgeCostOneTime] = useState<number>(0);
  const [serviceCostMonthly, setServiceCostMonthly] = useState<number>(0); // Assuming services are monthly unless specified otherwise
  const [serviceCostOneTime, setServiceCostOneTime] = useState<number>(0); // For services that might be one-time
  const [totalMonthlyCost, setTotalMonthlyCost] = useState<number>(0);
  const [totalOneTimeCost, setTotalOneTimeCost] = useState<number>(0);

  // Load pricing configuration from localStorage or default
  useEffect(() => {
    const pricingConfig = getPricingConfig();
    
    // Initialize meters with pricing from config
    setMeters(prevMeters => 
      prevMeters.map(meter => {
        const configMeter = pricingConfig.meters.find(m => m.id === meter.id);
        if (configMeter) {
          return { ...meter, rateNoAI: configMeter.rateNoAI, rateWithAI: configMeter.rateWithAI };
        }
        return meter;
      })
    );
    
    // Initialize services with pricing from config
    setServices(prevServices => 
      prevServices.map(service => {
        const configService = pricingConfig.services.find(s => s.id === service.id);
        if (configService) {
          return { 
            ...service, 
            rate: configService.rate, 
            minimum: configService.minimum 
          };
        }
        return service;
      })
    );
    const edgeConfig = pricingConfig.edgeDevice;

  }, [pricingReloadTrigger]);

  // --- Calculation Logic ---
  useEffect(() => {
    // 1. Calculate Meter Costs
    let currentMeterCost = 0;
    meters.forEach(meter => {
      const rate = terraAIOptIn ? meter.rateWithAI : meter.rateNoAI;
      currentMeterCost += rate * meter.quantity;
    });
    setMonthlyMeterCost(currentMeterCost);

    // 2. Calculate Edge Costs
    let currentEdgeMonthly = 0;
    let currentEdgeOneTime = 0;
    if (terraEdgeRequired) {
      const quantity = Math.max(1, terraEdgeQuantity); // Ensure quantity is at least 1
      const pricingConfig = getPricingConfig(); // Get latest pricing
      
      if (terraEdgePayment === 'monthly') {
        currentEdgeMonthly = pricingConfig.edgeDevice.monthlyRate * quantity;
      } else {
        currentEdgeOneTime = pricingConfig.edgeDevice.oneTimeRate * quantity;
      }
    }
    setEdgeCostMonthly(currentEdgeMonthly);
    setEdgeCostOneTime(currentEdgeOneTime);

    // 3. Calculate Service Costs (Treating all as one-time for now, adjust if needed)
    let currentServiceOneTime = 0;
    services.forEach(service => {
      if (service.selected) {
        let cost = 0;
        if (service.id === 's1') { // Mimics pages
          cost = service.rate * (service.quantity ?? 1);
        } else if (service.id === 's2') { // AI Philosophy
          // Only calculate if TerraAI is opted in
          if (terraAIOptIn) {
            cost = service.rate * (service.quantity ?? 1);
            cost = Math.max(cost, service.minimum ?? 0);
          }
        } else if (service.id === 's3') { // Initialization
          cost = service.rate * (service.quantity ?? 1);
          cost = Math.max(cost, service.minimum ?? 0);
        }
        // Add other service calculations if needed
        currentServiceOneTime += cost;
      }
    });
    
    // If AI Philosophy requires TerraAI, enforce it
    const aiPhilosophyService = services.find(s => s.id === 's2');
    if (aiPhilosophyService?.selected && !terraAIOptIn) {
        // Optionally reset the selection or show a warning
        console.warn("AI Philosophy selected but TerraAI is not opted in.");
    }

    setServiceCostOneTime(currentServiceOneTime);
    setServiceCostMonthly(0); // Reset monthly service cost if logic changes

    // 4. Calculate Totals
    setTotalMonthlyCost(currentMeterCost + currentEdgeMonthly + serviceCostMonthly);
    setTotalOneTimeCost(currentEdgeOneTime + currentServiceOneTime);

  }, [meters, terraAIOptIn, terraEdgeRequired, terraEdgePayment, services, terraEdgeQuantity]); // Added terraEdgeQuantity


  // --- Event Handlers ---
  const generateWordDocument = () => {
    // Create a new document
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: {
              size: 24, // 12pt
              font: "Calibri",
            },
            paragraph: {
              spacing: {
                line: 276, // 1.15 line spacing
              },
            },
          },
          {
            id: "Title",
            name: "Title",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 36, // 18pt
              bold: true,
              color: "2E74B5", // Blue color
            },
            paragraph: {
              spacing: {
                before: 240, // 12pt before
                after: 240, // 12pt after
              },
              alignment: AlignmentType.CENTER,
            },
          },
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 32, // 16pt
              bold: true,
              color: "2E74B5", // Blue color
            },
            paragraph: {
              spacing: {
                before: 240, // 12pt before
                after: 120, // 6pt after
              },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 28, // 14pt
              bold: true,
              color: "2E74B5", // Blue color
            },
            paragraph: {
              spacing: {
                before: 240, // 12pt before
                after: 120, // 6pt after
              },
            },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                right: 1440, // 1 inch
                bottom: 1440, // 1 inch
                left: 1440, // 1 inch
              },
            },
          },
          children: [
            // Title and Header
            new Paragraph({
              text: "TerraEMS Quotation",
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "India Pricing (INR)",
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }), // Empty line for spacing
            new Paragraph({ text: `Date: ${new Date().toLocaleDateString()}` }),
            new Paragraph({ text: "" }), // Empty line for spacing
            
            // Configuration Summary
            new Paragraph({
              text: "Configuration Summary",
              heading: HeadingLevel.HEADING_1,
            }),
            
            // Energy Meters Table
            new Paragraph({
              text: "Energy Meters",
              heading: HeadingLevel.HEADING_2,
            }),
            
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                left: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                right: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
              },
              rows: [
                // Header Row
                new TableRow({
                  tableHeader: true,
                  children: [
                    new TableCell({
                      width: {
                        size: 50,
                        type: WidthType.PERCENTAGE,
                      },
                      children: [new Paragraph({ text: "Meter Type",run: { bold: true } })],
                    }),
                    new TableCell({
                      width: {
                        size: 15,
                        type: WidthType.PERCENTAGE,
                      },
                      children: [new Paragraph({ text: "Quantity",run: { bold: true } })],
                    }),
                    new TableCell({
                      width: {
                        size: 15,
                        type: WidthType.PERCENTAGE,
                      },
                      children: [new Paragraph({ text: "Rate (₹)",run: { bold: true } })],
                    }),
                    new TableCell({
                      width: {
                        size: 20,
                        type: WidthType.PERCENTAGE,
                      },
                      children: [new Paragraph({ text: "Total (₹)",run: { bold: true } })],
                    }),
                  ],
                }),
                // Data Rows
                ...meters.filter(meter => meter.quantity > 0).map(meter => 
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: meter.name })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: meter.quantity.toString() })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: (terraAIOptIn ? meter.rateWithAI : meter.rateNoAI).toString() })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ 
                          text: ((terraAIOptIn ? meter.rateWithAI : meter.rateNoAI) * meter.quantity).toFixed(2) 
                        })],
                      }),
                    ],
                  })
                ),
                // Total Row
                new TableRow({
                  children: [
                    new TableCell({
                      columnSpan: 3,
                      children: [new Paragraph({ text: "Total Monthly Meter Cost", run: { bold: true } })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: `₹${monthlyMeterCost.toFixed(2)}`, run: { bold: true } })],
                    }),
                  ],
                }),
              ],
            }),
            
            new Paragraph({ text: "" }), // Empty line for spacing
            
            // TerraAI Selection
            new Paragraph({
              text: "TerraAI",
              heading: HeadingLevel.HEADING_2,
            }),
            
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                left: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                right: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
              },
              rows: [
                // Header Row
                new TableRow({
                  tableHeader: true,
                  children: [
                    new TableCell({
                      width: {
                        size: 50,
                        type: WidthType.PERCENTAGE,
                      },
                      children: [new Paragraph({ text: "Option", run: { bold: true } })],
                    }),
                    new TableCell({
                      width: {
                        size: 50,
                        type: WidthType.PERCENTAGE,
                      },
                      children: [new Paragraph({ text: "Selected", run: { bold: true } })],
                    }),
                  ],
                }),
                // Data Row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "TerraAI" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: terraAIOptIn ? "Yes" : "No" })],
                    }),
                  ],
                }),
              ],
            }),
            
            new Paragraph({ text: "" }), // Empty line for spacing
            
            // TerraEdge Device
            ...(terraEdgeRequired ? [
              new Paragraph({
                text: "TerraEdge Device",
                heading: HeadingLevel.HEADING_2,
              }),
              
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                borders: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "auto",
                  },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "auto",
                  },
                  left: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "auto",
                  },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "auto",
                  },
                },
                rows: [
                  // Header Row
                  new TableRow({
                    tableHeader: true,
                    children: [
                      new TableCell({
                        width: {
                          size: 30,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [new Paragraph({ text: "Item",run: { bold: true } })],
                      }),
                      new TableCell({
                        width: {
                          size: 20,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [new Paragraph({ text: "Quantity",run: { bold: true } })],
                      }),
                      new TableCell({
                        width: {
                          size: 25,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [new Paragraph({ text: "Payment Type",run: { bold: true } })],
                      }),
                      new TableCell({
                        width: {
                          size: 25,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [new Paragraph({ text: "Total Cost (₹)",run: { bold: true } })],
                      }),
                    ],
                  }),
                  // Data Row
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: "TerraEdge - Modbus RTU/TCP" })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: terraEdgeQuantity.toString() })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: terraEdgePayment === 'monthly' ? "Monthly" : "One-Time" })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ 
                          text: terraEdgePayment === 'monthly' 
                            ? `₹${edgeCostMonthly.toFixed(2)}/month` 
                            : `₹${edgeCostOneTime.toFixed(2)} (one-time)` 
                        })],
                      }),
                    ],
                  }),
                ],
              }),
              
              new Paragraph({ text: "" }), // Empty line for spacing
            ] : []),
            
            // Services
            ...(services.some(s => s.selected) ? [
              new Paragraph({
                text: "Services",
                heading: HeadingLevel.HEADING_2,
              }),
              
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                borders: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "auto",
                  },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "auto",
                  },
                  left: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "auto",
                  },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "auto",
                  },
                  insideHorizontal: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "auto",
                  },
                  insideVertical: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "auto",
                  },
                },
                rows: [
                  // Header Row
                  new TableRow({
                    tableHeader: true,
                    children: [
                      new TableCell({
                        width: {
                          size: 40,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [new Paragraph({ text: "Service", run: { bold: true } })],
                      }),
                      new TableCell({
                        width: {
                          size: 15,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [new Paragraph({ text: "Quantity", run: { bold: true } })],
                      }),
                      new TableCell({
                        width: {
                          size: 15,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [new Paragraph({ text: "Rate (₹)", run: { bold: true } })],
                      }),
                      new TableCell({
                        width: {
                          size: 30,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [new Paragraph({ text: "Total Cost (₹)", run: { bold: true } })],
                      }),
                    ],
                  }),
                  // Data Rows
                  ...services.filter(s => s.selected).map(service => {
                    let cost = 0;
                    let displayQuantity = service.quantity ?? 1;
                    let rateDisplay = service.rate;
                    
                    if (service.id === 's1') cost = service.rate * displayQuantity;
                    else if (service.id === 's2' && terraAIOptIn) cost = Math.max(service.rate * displayQuantity, service.minimum ?? 0);
                    else if (service.id === 's3') cost = Math.max(service.rate * displayQuantity, service.minimum ?? 0);
                    
                    // Skip if no cost (e.g., AI Philosophy without TerraAI)
                    if (cost === 0) return null;
                    
                    return new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph({ text: service.name })],
                        }),
                        new TableCell({
                          children: [new Paragraph({ text: displayQuantity.toString() })],
                        }),
                        new TableCell({
                          children: [new Paragraph({ 
                            text: `${rateDisplay}${service.unit ? ` ${service.unit}` : ''}` 
                          })],
                        }),
                        new TableCell({
                          children: [new Paragraph({ 
                            text: `₹${cost.toFixed(2)}${service.minimum && cost === service.minimum && service.rate * displayQuantity < service.minimum ? ' (Min. applied)' : ''}` 
                          })],
                        }),
                      ],
                    });
                  }).filter(row => row !== null),
                  // Total Row
                  new TableRow({
                    children: [
                      new TableCell({
                        columnSpan: 3,
                        children: [new Paragraph({ text: "Total Service Cost (One-Time)",run: { bold: true } })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `₹${serviceCostOneTime.toFixed(2)}`,run: { bold: true } })],
                      }),
                    ],
                  }),
                ],
              }),
              
              new Paragraph({ text: "" }), // Empty line for spacing
            ] : []),
            
            // Summary Section
            new Paragraph({
              text: "Cost Summary",
              heading: HeadingLevel.HEADING_1,
            }),
            
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                left: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                right: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                insideHorizontal: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
                insideVertical: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: "auto",
                },
              },
              rows: [
                // Header Row
                new TableRow({
                  tableHeader: true,
                  children: [
                    new TableCell({
                      width: {
                        size: 70,
                        type: WidthType.PERCENTAGE,
                      },
                      children: [new Paragraph({ text: "Cost Category",run: { bold: true } })],
                    }),
                    new TableCell({
                      width: {
                        size: 30,
                        type: WidthType.PERCENTAGE,
                      },
                      children: [new Paragraph({ text: "Amount (₹)",run: { bold: true } })],
                    }),
                  ],
                }),
                // Monthly Costs
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Monthly Energy Meter Cost" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: `₹${monthlyMeterCost.toFixed(2)}/month` })],
                    }),
                  ],
                }),
                // TerraEdge Monthly if applicable
                ...(terraEdgeRequired && terraEdgePayment === 'monthly' ? [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `TerraEdge Device (${terraEdgeQuantity} unit${terraEdgeQuantity > 1 ? 's' : ''})` })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `₹${edgeCostMonthly.toFixed(2)}/month` })],
                      }),
                    ],
                  }),
                ] : []),
                // Total Monthly
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Total Monthly Cost", run: { bold: true } })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: `₹${totalMonthlyCost.toFixed(2)}/month`, run: { bold: true } })],
                    }),
                  ],
                }),
                // One-Time Costs Header
                new TableRow({
                  children: [
                    new TableCell({
                      columnSpan: 2,
                      children: [new Paragraph({ text: "One-Time Costs", run: { bold: true } })],
                    }),
                  ],
                }),
                // TerraEdge One-Time if applicable
                ...(terraEdgeRequired && terraEdgePayment === 'one-time' ? [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `TerraEdge Device (${terraEdgeQuantity} unit${terraEdgeQuantity > 1 ? 's' : ''})` })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `₹${edgeCostOneTime.toFixed(2)}` })],
                      }),
                    ],
                  }),
                ] : []),
                // Service Costs if any
                ...(serviceCostOneTime > 0 ? [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: "Service Charges" })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `₹${serviceCostOneTime.toFixed(2)}` })],
                      }),
                    ],
                  }),
                ] : []),
                // Total One-Time
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Total One-Time Cost", run: { bold: true } })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: `₹${totalOneTimeCost.toFixed(2)}`, run: { bold: true } })],
                    }),
                  ],
                }),
              ],
            }),
            
            new Paragraph({ text: "" }), // Empty line for spacing
            
            // Terms and Conditions
            new Paragraph({
              text: "Terms and Conditions",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: "1. Prices are in Indian Rupees (INR) and exclusive of applicable taxes." }),
            new Paragraph({ text: "2. This quotation is valid for 30 days from the date of issue." }),
            new Paragraph({ text: "3. Payment terms: 50% advance, 50% upon completion." }),
            new Paragraph({ text: "4. Delivery timeline will be confirmed upon order confirmation." }),
            
            // Contact Information
            new Paragraph({ text: "" }), // Empty line for spacing
            new Paragraph({
              text: "Contact Information",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: "TerraEMS" }),
            new Paragraph({ text: "Gujarat, India" }),
            new Paragraph({ text: "Email: info@terraems.com" }),
            new Paragraph({ text: "Phone: +91 XXXXXXXXXX" }),
          ],
        },
      ],
    });

    // Generate the document
    Packer.toBlob(doc).then(blob => {
      saveAs(blob, "TerraEMS_Quotation.docx");
    });
  };

  const handleMeterQuantityChange = (id: string, value: string) => {
    const quantity = parseInt(value, 10);
    if (!isNaN(quantity) && quantity >= 0) {
      setMeters(prevMeters =>
        prevMeters.map(meter =>
          meter.id === id ? { ...meter, quantity: quantity } : meter
        )
      );
    } else if (value === '') {
        setMeters(prevMeters =>
            prevMeters.map(meter =>
              meter.id === id ? { ...meter, quantity: 0 } : meter
            )
          );
    }
  };

  const handleTerraEdgeQuantityChange = (value: string) => {
    const quantity = parseInt(value, 10);
    if (!isNaN(quantity) && quantity >= 1) { // Ensure quantity is at least 1
      setTerraEdgeQuantity(quantity);
    } else if (value === '') {
      setTerraEdgeQuantity(0); // Allow empty value (0) instead of defaulting to 1
    }
  };

  const handleServiceSelectionChange = (id: string, selected: boolean) => {
    setServices(prevServices =>
      prevServices.map(service =>
        service.id === id ? { ...service, selected: selected } : service
      )
    );
  };

  const handleServiceQuantityChange = (id: string, value: string) => {
    const quantity = parseInt(value, 10);
    if (!isNaN(quantity) && quantity >= 1) { // Ensure quantity is at least 1 for services like pages/components
      setServices(prevServices =>
        prevServices.map(service =>
          service.id === id ? { ...service, quantity: quantity } : service
        )
      );
    } else if (value === '') {
      setServices(prevServices =>
        prevServices.map(service =>
          service.id === id ? { ...service, quantity: 0 } : service // Allow empty value (0) instead of defaulting to 1
        )
      );
    }
  };

  const handleAdminLogin = (success: boolean) => {
    if (success) {
      setIsAdminLoggedIn(true);
      setIsAdminLoginOpen(false);
      setToast({
        show: true,
        message: 'Logged in successfully!',
        type: 'success'
      });
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
     // Trigger a reload of pricing data when returning from admin dashboard
     setPricingReloadTrigger(prev => prev + 1);
     setToast({
      show: true,
      message: 'Logged out successfully!',
      type: 'info'
    });
  };

  // --- Render ---
  if (isAdminLoggedIn) {
    return <AdminDashboard onLogout={handleAdminLogout} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      <header className="mb-8 text-center relative">
        <div className="absolute top-0 right-0">
          <Button 
            variant="primary" 
            onClick={() => setIsAdminLoginOpen(true)}
            className="text-sm"
          >
            Admin
          </Button>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-blue-700">TerraEMS Quotation Generator</h1>
        <p className="text-gray-600 mt-2">India Pricing (INR)</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Section */}
        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">Configuration</h2>

          {/* Energy Meters */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-gray-700">1. Energy Meters (Monthly Cost)</h3>
            <div className="space-y-3">
              {meters.map((meter) => (
                <div key={meter.id} className="flex items-center justify-between space-x-4">
                  <label htmlFor={meter.id} className="text-sm text-gray-600 flex-1">{meter.name}</label>
                  <input
                    type="number"
                    id={meter.id}
                    min="0"
                    value={meter.quantity === 0 ? '' : meter.quantity}
                    onChange={(e) => handleMeterQuantityChange(meter.id, e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Qty"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* TerraAI Opt-in */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-gray-700">2. TerraAI</h3>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="terraAI"
                checked={terraAIOptIn}
                onChange={(e) => setTerraAIOptIn(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="terraAI" className="ml-2 text-sm text-gray-700">Opt-in for TerraAI (Affects Meter Rates)</label>
            </div>
             {/* Display Scan Rate Info */}
             <p className="text-xs text-gray-500 mt-2">
                Scan Rate: {terraAIOptIn
                    ? '"Rates per month for above 1 min scan rates if opted for TerraAI"'
                    : '"Rates per month for above 1 min scan rates if not opted for TerraAI"'}
             </p>
          </div>

          {/* TerraEdge Device */}
                
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-gray-700">3. TerraEdge Device</h3>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="terraEdge"
              checked={terraEdgeRequired}
              onChange={(e) => setTerraEdgeRequired(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="terraEdge" className="ml-2 text-sm text-gray-700">Require TerraEdge - Modbus RTU/TCP</label>
          </div>
          {terraEdgeRequired && (
            <div className="ml-6 space-y-3">
              {/* Quantity Input */}
              <div className="flex items-center space-x-2">
                <label htmlFor="terraEdgeQty" className="text-sm text-gray-600">Quantity:</label>
                <input
                  type="number"
                  id="terraEdgeQty"
                  
                  value={terraEdgeQuantity === 0 ? '' : terraEdgeQuantity}
                  onChange={(e) => handleTerraEdgeQuantityChange(e.target.value)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Qty"
                />
              </div>

              {/* Payment Option */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Option:</p>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="edgeMonthly"
                    name="edgePayment"
                    value="monthly"
                    checked={terraEdgePayment === 'monthly'}
                    onChange={(e) => setTerraEdgePayment(e.target.value as 'monthly' | 'one-time')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="edgeMonthly" className="ml-2 text-sm text-gray-700">
                    Monthly (₹{getPricingConfig().edgeDevice.monthlyRate}/month)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="edgeOneTime"
                    name="edgePayment"
                    value="one-time"
                    checked={terraEdgePayment === 'one-time'}
                    onChange={(e) => setTerraEdgePayment(e.target.value as 'monthly' | 'one-time')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="edgeOneTime" className="ml-2 text-sm text-gray-700">
                    One-Time (₹{getPricingConfig().edgeDevice.oneTimeRate})
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

                    
        {/* Service Charges */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-gray-700">4. Service Charges (One-Time)</h3>
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 mr-4">
                    <input
                      type="checkbox"
                      id={service.id}
                      checked={service.selected}
                      onChange={(e) => handleServiceSelectionChange(service.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      // Disable AI Philosophy if TerraAI is not selected
                      disabled={service.id === 's2' && !terraAIOptIn}
                    />
                    <label htmlFor={service.id} className={`ml-2 text-sm text-gray-700 ${service.id === 's2' && !terraAIOptIn ? 'text-gray-400' : ''}`}>
                      {service.name}
                      {service.rate && <span className="text-xs text-gray-500"> (₹{service.rate}{service.unit ? ` ${service.unit}` : ''})</span>}
                      {service.minimum && <span className="text-xs text-gray-500"> (Min. ₹{service.minimum})</span>}
                    </label>
                  </div>
                  {/* Input for quantity if applicable (e.g., mimics pages, components) */}
                  {(service.id === 's1' || service.id === 's2' || service.id === 's3') && service.selected && (
                    <input
                      type="number"
                      min="1"
                      value={service.quantity === 0 ? '' : service.quantity}
                      onChange={(e) => handleServiceQuantityChange(service.id, e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder={service.id === 's1' ? "Pages" : "Components"}
                    />
                  )}
                </div>
                {/* Warning for AI Philosophy without TerraAI */}
                {service.id === 's2' && !terraAIOptIn && service.selected && (
                  <p className="text-xs text-red-500 ml-6 mt-1">Requires TerraAI Opt-in.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
                    
      {/* Output/Summary Section */}
      <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-fit">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">Quotation Summary</h2>
                    
        <div className="space-y-4">
          {/* Monthly Costs */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Estimated Monthly Costs</h3>
            <div className="pl-4 space-y-1 text-sm text-gray-600">
              <p>Energy Meters: <span className="font-medium">₹{monthlyMeterCost.toFixed(2)}</span></p>
              {terraEdgeRequired && terraEdgePayment === 'monthly' && (
                <p>TerraEdge Device ({terraEdgeQuantity} unit{terraEdgeQuantity > 1 ? 's' : ''}): <span className="font-medium">₹{edgeCostMonthly.toFixed(2)}</span></p>
              )}
              {/* Add monthly service costs here if any */}
            </div>
            <p className="mt-2 text-lg font-semibold text-blue-700">Total Monthly: ₹{totalMonthlyCost.toFixed(2)}</p>
          </div>
                    
          <hr className="my-4 border-gray-200"/>
                    
          {/* One-Time Costs */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Estimated One-Time Costs</h3>
            <div className="pl-4 space-y-1 text-sm text-gray-600">
              {terraEdgeRequired && terraEdgePayment === 'one-time' && (
                <p>TerraEdge Device ({terraEdgeQuantity} unit{terraEdgeQuantity > 1 ? 's' : ''}): <span className="font-medium">₹{edgeCostOneTime.toFixed(2)}</span></p>
              )}
              {serviceCostOneTime > 0 && (
                <>
                  <p className="font-medium mt-1">Services:</p>
                  <ul className="list-disc list-inside pl-2">
                    {services.filter(s => s.selected).map(s => {
                      let cost = 0;
                      let displayQuantity = s.quantity ?? 1;
                      if (s.id === 's1') cost = s.rate * displayQuantity;
                      else if (s.id === 's2' && terraAIOptIn) cost = Math.max(s.rate * displayQuantity, s.minimum ?? 0);
                      else if (s.id === 's3') cost = Math.max(s.rate * displayQuantity, s.minimum ?? 0);
                    
                      return cost > 0 ? (
                        <li key={s.id}>
                          {s.name}
                          {(s.id === 's1' || s.id === 's2' || s.id === 's3') && ` (Qty: ${displayQuantity})`}: ₹{cost.toFixed(2)}
                          {s.minimum && cost === s.minimum && s.rate * displayQuantity < s.minimum && <span className="text-xs"> (Minimum applied)</span>}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </>
              )}
            </div>
            <p className="mt-2 text-lg font-semibold text-blue-700">Total One-Time: ₹{totalOneTimeCost.toFixed(2)}</p>
          </div>
        </div>
                    
        {/* Optional: Add a print button */}
        <div className="mt-8 text-center flex justify-center space-x-4">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            Print Quotation
          </button>
          <button
            onClick={generateWordDocument}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
          >
            Download as DOC
          </button>
        </div>
      </section>
    </div>

    {isAdminLoginOpen && (
        <AdminLogin 
          onLogin={handleAdminLogin} 
          onClose={() => setIsAdminLoginOpen(false)} 
        />
      )}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
  </div>
  );
};
                    
export default App;
