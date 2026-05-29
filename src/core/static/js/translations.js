/**
 * StockLens multilingual dictionary.
 * Supports: English (en), Arabic (ar), Spanish (es).
 *
 * Usage:  t('nav.overview')  → translated string
 *         applyTranslations() → refreshes all [data-i18n] elements
 */
window.TRANSLATIONS = {
  en: {
    'nav.overview':      'Overview',
    'nav.products':      'Products',
    'nav.inventory':     'Inventory',
    'nav.decisions':     'Decisions',
    'nav.forecast':      'Forecast',
    'nav.analytics':     'Analytics',
    'nav.evaluation':    'Evaluation',
    'nav.scenario':      'Scenarios',
    'nav.managerSection':'Manager',
    'nav.logout':        'Logout',

    'page.overview':     'Overview',
    'page.products':     'Products',
    'page.inventory':    'Inventory',
    'page.decisions':    'Decisions',
    'page.forecast':     'Forecast',
    'page.analytics':    'Analytics',
    'page.evaluation':   'Evaluation',
    'page.scenario':     'Scenario Comparison',

    'kpi.totalProducts': 'Total Products',
    'kpi.activeProducts':'Active Products',
    'kpi.reorderNow':    'Reorder Now',
    'kpi.inventoryValue':'Inventory Value',

    'card.decisionBreakdown':  'Decision Breakdown',
    'card.riskBreakdown':      'Risk Overview',
    'card.salesTrend':         'Sales Trend — Last 30 Days',
    'card.forecastVsActual':   'Forecast vs Actual Demand',
    'card.inventoryLevels':    'Inventory Levels vs Reorder Points',
    'card.scenarioExplain':    'How Scenario Comparison Works',
    'card.scenarioDesc':       'A 90-day simulation compares two strategies on historical sales. Without system: reactive — reorder only when stock reaches zero. With system: proactive — reorder at the calculated reorder point.',
    'card.scenarioChart':      'Stockout Days Comparison',

    'th.product':        'Product',
    'th.category':       'Category',
    'th.price':          'Price',
    'th.seasonal':       'Seasonal',
    'th.status':         'Status',
    'th.decision':       'Decision',
    'th.action':         'Action',
    'th.stock':          'Stock on Hand',
    'th.stockBar':       'Level',
    'th.reorderPoint':   'Reorder Point',
    'th.risk':           'Risk',
    'th.lastUpdated':    'Last Updated',
    'th.reason':         'Reason',
    'th.forecastDemand': 'Forecast Demand',
    'th.safetyStock':    'Safety Stock',
    'th.orderQty':       'Order Qty',
    'th.predicted':      'Predicted (daily)',
    'th.actual':         'Actual (daily)',
    'th.mae':            'MAE',
    'th.accuracy':       'Accuracy',
    'th.evalPeriod':     'Eval Period',
    'th.stockoutWithout':'Stockout Days (Without)',
    'th.stockoutWith':   'Stockout Days (With)',
    'th.overstockWithout':'Overstock Days (Without)',
    'th.overstockWith':  'Overstock Days (With)',
    'th.reordersWithout':'Reorders (Without)',
    'th.reordersWith':   'Reorders (With)',
    'th.improvement':    'Stockout Improvement',

    'search.products':   'Search products…',

    'action.reorder':    'Reorder',
    'action.at_risk':    'At Risk',
    'action.hold':       'Hold',
    'action.inactive':   'Inactive',

    'status.active':     'Active',
    'status.inactive':   'Inactive',

    'risk.low':          'Low',
    'risk.medium':       'Medium',
    'risk.high':         'High',

    'btn.deactivate':    'Deactivate',
    'btn.activate':      'Activate',

    'eval.avgAccuracy':  'Avg Accuracy',
    'eval.avgMae':       'Avg MAE',
    'eval.products':     'Products Evaluated',

    'upload.title':    'Upload Sales Data',
    'upload.desc':     'Upload one or more CSV files to add sales data. Forecasts and decisions will be recalculated automatically.',
    'upload.template': '↓ Download Template',
    'upload.format':   'Required columns:',
    'upload.example':  'e.g. 2024-06-15, Cola 330ml, 22',
    'upload.hint':     'Drag & drop CSV files here, or click to browse',
    'upload.multi':    'Multiple files supported — one per product, one per month, or bulk',
    'upload.submit':   'Upload & Process',
    'upload.clear':    'Clear',

    'nav.daily':           'Daily',
    'nav.upload':          'Upload Data',
    'nav.abcxyz':          'ABC-XYZ',
    'nav.team':            'Team',

    'page.upload':         'Upload Data',
    'page.classification': 'ABC-XYZ Classification',
    'page.team':           'Team',

    'card.lowStockAlerts':   'Low Stock Alerts',
    'card.recentActivity':   'Recent Activity',
    'card.uploadHistory':    'Upload History',
    'card.decisionWorklist': 'Decision Worklist',
    'card.whatIfScenario':   'What-If Scenario Builder',
    'card.baselineScenario': 'Pre-computed Baseline (90-day)',
    'card.abcxyzTitle':      'ABC-XYZ Inventory Classification',
    'card.teamManagement':   'Team Management',
    'card.categoryBreakdown':'Category Breakdown',
    'card.topProducts':      'Top Products',
    'card.decisionSnapshot': 'Decision Snapshot',

    'btn.viewAll':         'View all →',
    'btn.viewInventory':   'View inventory →',
    'btn.exportCsv':       'Export CSV',
    'btn.runFullPipeline': 'Run Full Pipeline',
    'btn.runSimulation':   'Run Simulation',

    'th.sku':               'SKU',
    'th.reorderQty':        'Reorder Qty',
    'th.confidence':        'Confidence',
    'th.markOrdered':       'Mark Ordered',
    'th.file':              'File',
    'th.uploadedBy':        'Uploaded By',
    'th.rowsAdded':         'Rows Added',
    'th.newProducts':       'New Products',
    'th.duplicatesSkipped': 'Duplicates Skipped',
    'th.stockUpdates':      'Stock Updates',
    'th.date':              'Date',
    'th.model':             'Model',
    'th.dailyDemand':       'Daily Demand',
    'th.range95':           '95% Range',
    'th.eoq':               'EOQ',
    'th.trend':             'Trend',
    'th.stockoutPct':       'Stockout %',
    'th.naiveMae':          'Naïve MAE',
    'th.rmse':              'RMSE',
    'th.bias':              'Bias',
    'th.mase':              'MASE',
    'th.trackingSignal':    'Tracking Signal',
    'th.period':            'Period',
    'th.adjustedReorderQty':'Adjusted Reorder Qty',
    'th.abc':               'ABC',
    'th.xyz':               'XYZ',
    'th.class':             'Class',
    'th.revenuePct':        'Revenue %',
    'th.cv':                'CV (variability)',
    'th.reviewFrequency':   'Review Frequency',
    'th.strategy':          'Strategy',
    'th.name':              'Name',
    'th.email':             'Email',
    'th.role':              'Role',
    'th.actions':           'Actions',

    'filter.all':    'All',
    'filter.reorder':'Reorder',
    'filter.atRisk': 'At Risk',
    'filter.hold':   'Hold',

    'search.inventory': 'Search inventory…',
    'search.decisions': 'Search decisions…',

    'nav.manual':            'Manual Entry',
    'page.manual':           'Manual Data Entry',

    'manual.createProduct':  'Create Product',
    'manual.createDesc':     'Add a new product that you will track sales for manually.',
    'manual.newProduct':     'New Product',
    'manual.productName':    'Product Name *',
    'manual.category':       'Category',
    'manual.currentStock':   'Current Stock',
    'manual.price':          'Price (£, optional)',
    'manual.createProductBtn':'Create Product',
    'manual.yourProducts':   'Your Manually-Tracked Products',
    'manual.noProducts':     'No manually-tracked products yet',
    'manual.noProductsHint': 'Click "New Product" above to add your first product.',
    'manual.workingOn':      'Working on',
    'manual.runPipeline':    'Generate Forecast & Decision',
    'manual.changeProduct':  'Change Product',
    'manual.addSales':       'Add Sales Entry',
    'manual.addSalesDesc':   'Enter the number of units sold on a given day. Re-enter a date to update it.',
    'manual.date':           'Date *',
    'manual.unitsSold':      'Units Sold *',
    'manual.saveEntry':      'Save Entry',
    'manual.today':          'Today',
    'manual.timeline':       'Sales Timeline',
    'manual.entryType':      'Type',
    'manual.manual':         'Manual',
    'manual.autoZero':       'Auto-filled (0)',
    'manual.daysReady':      'days — ready',
    'manual.daysNeeded':     'days recorded',
    'manual.inStock':        'in stock',
    'manual.lastEntry':      'Last entry',
    'manual.gapsFilled':     'missing days filled with 0',
    'manual.daysProgress':   'days recorded',
    'manual.readyToForecast':'Ready to forecast!',
    'manual.daysRecorded':   'days recorded',
    'manual.daysUntilReady': 'more days needed',
    'manual.days':           'days',
    'manual.autoFilled':     'auto-filled',
    'manual.noEntries':      'No sales entries yet.',
    'manual.pipelineRunning':'Running pipeline…',
    'manual.pipelineWithEval':'Forecast, decisions and accuracy evaluation complete.',
    'manual.pipelineNoEval': 'Forecast and decisions complete. Add 90+ days for accuracy metrics.',
    'manual.selectProductFirst':'Please select a product first.',
    'manual.errorName':      'Product name is required.',
    'manual.errorDate':      'Please select a date.',
    'manual.errorUnits':     'Units sold must be 0 or more.',

    'yes': 'Yes',
    'no':  'No',
  },

  ar: {
    'nav.overview':      'نظرة عامة',
    'nav.products':      'المنتجات',
    'nav.inventory':     'المخزون',
    'nav.decisions':     'القرارات',
    'nav.forecast':      'التنبؤ',
    'nav.analytics':     'التحليلات',
    'nav.evaluation':    'التقييم',
    'nav.scenario':      'السيناريوهات',
    'nav.managerSection':'المدير',
    'nav.logout':        'تسجيل الخروج',

    'page.overview':     'نظرة عامة',
    'page.products':     'المنتجات',
    'page.inventory':    'المخزون',
    'page.decisions':    'القرارات',
    'page.forecast':     'التنبؤ بالطلب',
    'page.analytics':    'التحليلات',
    'page.evaluation':   'تقييم الدقة',
    'page.scenario':     'مقارنة السيناريوهات',

    'kpi.totalProducts': 'إجمالي المنتجات',
    'kpi.activeProducts':'المنتجات النشطة',
    'kpi.reorderNow':    'يحتاج إعادة طلب',
    'kpi.inventoryValue':'قيمة المخزون',

    'card.decisionBreakdown':  'ملخص القرارات',
    'card.riskBreakdown':      'نظرة عامة على المخاطر',
    'card.salesTrend':         'اتجاه المبيعات — آخر 30 يوم',
    'card.forecastVsActual':   'التنبؤ مقابل الفعلي',
    'card.inventoryLevels':    'مستويات المخزون مقابل نقاط إعادة الطلب',
    'card.scenarioExplain':    'كيفية عمل مقارنة السيناريوهات',
    'card.scenarioDesc':       'محاكاة 90 يومًا تقارن استراتيجيتين. بدون نظام: تفاعلي. مع النظام: استباقي عند نقطة إعادة الطلب.',
    'card.scenarioChart':      'مقارنة أيام نفاد المخزون',

    'th.product':        'المنتج',
    'th.category':       'الفئة',
    'th.price':          'السعر',
    'th.seasonal':       'موسمي',
    'th.status':         'الحالة',
    'th.decision':       'القرار',
    'th.action':         'الإجراء',
    'th.stock':          'المخزون الحالي',
    'th.stockBar':       'المستوى',
    'th.reorderPoint':   'نقطة إعادة الطلب',
    'th.risk':           'المخاطر',
    'th.lastUpdated':    'آخر تحديث',
    'th.reason':         'السبب',
    'th.forecastDemand': 'الطلب المتوقع',
    'th.safetyStock':    'مخزون الأمان',
    'th.orderQty':       'كمية الطلب',
    'th.predicted':      'متوقع (يومي)',
    'th.actual':         'فعلي (يومي)',
    'th.mae':            'متوسط الخطأ',
    'th.accuracy':       'الدقة',
    'th.evalPeriod':     'فترة التقييم',
    'th.stockoutWithout':'أيام النفاد (بدون)',
    'th.stockoutWith':   'أيام النفاد (مع)',
    'th.overstockWithout':'الفائض (بدون)',
    'th.overstockWith':  'الفائض (مع)',
    'th.reordersWithout':'الطلبات (بدون)',
    'th.reordersWith':   'الطلبات (مع)',
    'th.improvement':    'تحسين النفاد',

    'search.products':   'بحث عن المنتجات…',

    'action.reorder':    'إعادة طلب',
    'action.at_risk':    'في خطر',
    'action.hold':       'انتظار',
    'action.inactive':   'غير نشط',

    'status.active':     'نشط',
    'status.inactive':   'غير نشط',

    'risk.low':          'منخفض',
    'risk.medium':       'متوسط',
    'risk.high':         'مرتفع',

    'btn.deactivate':    'تعطيل',
    'btn.activate':      'تفعيل',

    'eval.avgAccuracy':  'متوسط الدقة',
    'eval.avgMae':       'متوسط الخطأ',
    'eval.products':     'المنتجات المقيّمة',

    'upload.title':    'رفع بيانات المبيعات',
    'upload.desc':     'ارفع ملف CSV واحداً أو أكثر لإضافة بيانات المبيعات. سيتم إعادة حساب التنبؤات والقرارات تلقائياً.',
    'upload.template': '↓ تنزيل القالب',
    'upload.format':   'الأعمدة المطلوبة:',
    'upload.example':  'مثال: 2024-06-15, Cola 330ml, 22',
    'upload.hint':     'اسحب وأفلت ملفات CSV هنا أو انقر للتصفح',
    'upload.multi':    'يدعم ملفات متعددة',
    'upload.submit':   'رفع ومعالجة',
    'upload.clear':    'مسح',

    'nav.daily':           'يومي',
    'nav.upload':          'رفع البيانات',
    'nav.abcxyz':          'ABC-XYZ',
    'nav.team':            'الفريق',

    'page.upload':         'رفع البيانات',
    'page.classification': 'تصنيف ABC-XYZ',
    'page.team':           'الفريق',

    'card.lowStockAlerts':   'تنبيهات المخزون المنخفض',
    'card.recentActivity':   'النشاط الأخير',
    'card.uploadHistory':    'سجل الرفع',
    'card.decisionWorklist': 'قائمة القرارات',
    'card.whatIfScenario':   'محاكاة السيناريو',
    'card.baselineScenario': 'الأساس المحسوب (90 يوم)',
    'card.abcxyzTitle':      'تصنيف ABC-XYZ للمخزون',
    'card.teamManagement':   'إدارة الفريق',
    'card.categoryBreakdown':'توزيع الفئات',
    'card.topProducts':      'أفضل المنتجات',
    'card.decisionSnapshot': 'لقطة القرار',

    'btn.viewAll':         'عرض الكل →',
    'btn.viewInventory':   'عرض المخزون →',
    'btn.exportCsv':       'تصدير CSV',
    'btn.runFullPipeline': 'تشغيل كامل',
    'btn.runSimulation':   'تشغيل المحاكاة',

    'th.sku':               'الرمز',
    'th.reorderQty':        'كمية إعادة الطلب',
    'th.confidence':        'الثقة',
    'th.markOrdered':       'تأكيد الطلب',
    'th.file':              'الملف',
    'th.uploadedBy':        'رُفع بواسطة',
    'th.rowsAdded':         'صفوف مضافة',
    'th.newProducts':       'منتجات جديدة',
    'th.duplicatesSkipped': 'مكررات متجاوزة',
    'th.stockUpdates':      'تحديثات المخزون',
    'th.date':              'التاريخ',
    'th.model':             'النموذج',
    'th.dailyDemand':       'الطلب اليومي',
    'th.range95':           'النطاق 95٪',
    'th.eoq':               'الكمية الاقتصادية',
    'th.trend':             'الاتجاه',
    'th.stockoutPct':       'نسبة النفاد',
    'th.naiveMae':          'MAE الساذج',
    'th.rmse':              'RMSE',
    'th.bias':              'الانحياز',
    'th.mase':              'MASE',
    'th.trackingSignal':    'إشارة التتبع',
    'th.period':            'الفترة',
    'th.adjustedReorderQty':'كمية الطلب المعدّلة',
    'th.abc':               'ABC',
    'th.xyz':               'XYZ',
    'th.class':             'التصنيف',
    'th.revenuePct':        'نسبة الإيرادات',
    'th.cv':                'معامل التباين',
    'th.reviewFrequency':   'تكرار المراجعة',
    'th.strategy':          'الاستراتيجية',
    'th.name':              'الاسم',
    'th.email':             'البريد الإلكتروني',
    'th.role':              'الدور',
    'th.actions':           'الإجراءات',

    'filter.all':    'الكل',
    'filter.reorder':'إعادة طلب',
    'filter.atRisk': 'في خطر',
    'filter.hold':   'انتظار',

    'search.inventory': 'بحث في المخزون…',
    'search.decisions': 'بحث في القرارات…',

    'nav.manual':'الإدخال اليدوي','page.manual':'إدخال البيانات يدوياً',
    'manual.createProduct':'إنشاء منتج','manual.createDesc':'أضف منتجاً جديداً لتتبع مبيعاته يدوياً.',
    'manual.newProduct':'منتج جديد','manual.productName':'اسم المنتج *','manual.category':'الفئة',
    'manual.currentStock':'المخزون الحالي','manual.price':'السعر (£، اختياري)','manual.createProductBtn':'إنشاء المنتج',
    'manual.yourProducts':'منتجاتك المُتتبَّعة يدوياً','manual.noProducts':'لا توجد منتجات بعد','manual.noProductsHint':'انقر على "منتج جديد" لإضافة منتجك الأول.',
    'manual.workingOn':'تعمل على','manual.runPipeline':'توليد التنبؤ والقرار','manual.changeProduct':'تغيير المنتج',
    'manual.addSales':'إضافة مبيعات','manual.addSalesDesc':'أدخل عدد الوحدات المباعة في يوم معين.',
    'manual.date':'التاريخ *','manual.unitsSold':'الوحدات المباعة *','manual.saveEntry':'حفظ الإدخال','manual.today':'اليوم',
    'manual.timeline':'الجدول الزمني للمبيعات','manual.entryType':'النوع','manual.manual':'يدوي','manual.autoZero':'مُعبَّأ تلقائياً (0)',
    'manual.daysReady':'أيام — جاهز','manual.daysNeeded':'أيام مسجلة','manual.inStock':'في المخزون',
    'manual.lastEntry':'آخر إدخال','manual.gapsFilled':'أيام مفقودة مُعبَّأة بصفر',
    'manual.daysProgress':'أيام مسجلة','manual.readyToForecast':'جاهز للتنبؤ!',
    'manual.daysRecorded':'أيام مسجلة','manual.daysUntilReady':'أيام إضافية مطلوبة',
    'manual.days':'أيام','manual.autoFilled':'مُعبَّأ تلقائياً','manual.noEntries':'لا توجد إدخالات بعد.',
    'manual.pipelineRunning':'جارٍ تشغيل الخط…','manual.pipelineWithEval':'اكتمل التنبؤ والقرارات والتقييم.',
    'manual.pipelineNoEval':'اكتمل التنبؤ والقرارات. أضف 90+ يوماً لمقاييس الدقة.',
    'manual.selectProductFirst':'يرجى اختيار منتج أولاً.','manual.errorName':'اسم المنتج مطلوب.','manual.errorDate':'يرجى اختيار تاريخ.','manual.errorUnits':'الوحدات المباعة يجب أن تكون 0 أو أكثر.',

    'yes': 'نعم',
    'no':  'لا',
  },

  es: {
    'nav.overview':      'Resumen',
    'nav.products':      'Productos',
    'nav.inventory':     'Inventario',
    'nav.decisions':     'Decisiones',
    'nav.forecast':      'Pronóstico',
    'nav.analytics':     'Análisis',
    'nav.evaluation':    'Evaluación',
    'nav.scenario':      'Escenarios',
    'nav.managerSection':'Gerente',
    'nav.logout':        'Cerrar sesión',

    'page.overview':     'Resumen',
    'page.products':     'Productos',
    'page.inventory':    'Inventario',
    'page.decisions':    'Decisiones',
    'page.forecast':     'Pronóstico de demanda',
    'page.analytics':    'Análisis',
    'page.evaluation':   'Evaluación del modelo',
    'page.scenario':     'Comparación de escenarios',

    'kpi.totalProducts': 'Total Productos',
    'kpi.activeProducts':'Productos Activos',
    'kpi.reorderNow':    'Reordenar Ya',
    'kpi.inventoryValue':'Valor del Inventario',

    'card.decisionBreakdown':  'Resumen de Decisiones',
    'card.riskBreakdown':      'Vista de Riesgo',
    'card.salesTrend':         'Tendencia de Ventas — Últimos 30 días',
    'card.forecastVsActual':   'Pronóstico vs Demanda Real',
    'card.inventoryLevels':    'Niveles de Inventario vs Puntos de Reorden',
    'card.scenarioExplain':    'Cómo Funciona la Comparación',
    'card.scenarioDesc':       'Simulación de 90 días que compara dos estrategias. Sin sistema: reactivo. Con sistema: proactivo en el punto de reorden.',
    'card.scenarioChart':      'Días sin stock: Comparación',

    'th.product':        'Producto',
    'th.category':       'Categoría',
    'th.price':          'Precio',
    'th.seasonal':       'Estacional',
    'th.status':         'Estado',
    'th.decision':       'Decisión',
    'th.action':         'Acción',
    'th.stock':          'Stock Actual',
    'th.stockBar':       'Nivel',
    'th.reorderPoint':   'Punto de Reorden',
    'th.risk':           'Riesgo',
    'th.lastUpdated':    'Última Actualización',
    'th.reason':         'Motivo',
    'th.forecastDemand': 'Demanda Pronosticada',
    'th.safetyStock':    'Stock de Seguridad',
    'th.orderQty':       'Cant. Pedido',
    'th.predicted':      'Previsto (diario)',
    'th.actual':         'Real (diario)',
    'th.mae':            'MAE',
    'th.accuracy':       'Exactitud',
    'th.evalPeriod':     'Período de Evaluación',
    'th.stockoutWithout':'Días sin stock (Sin)',
    'th.stockoutWith':   'Días sin stock (Con)',
    'th.overstockWithout':'Sobrestock (Sin)',
    'th.overstockWith':  'Sobrestock (Con)',
    'th.reordersWithout':'Pedidos (Sin)',
    'th.reordersWith':   'Pedidos (Con)',
    'th.improvement':    'Mejora en Stockout',

    'search.products':   'Buscar productos…',

    'action.reorder':    'Reordenar',
    'action.at_risk':    'En Riesgo',
    'action.hold':       'Mantener',
    'action.inactive':   'Inactivo',

    'status.active':     'Activo',
    'status.inactive':   'Inactivo',

    'risk.low':          'Bajo',
    'risk.medium':       'Medio',
    'risk.high':         'Alto',

    'btn.deactivate':    'Desactivar',
    'btn.activate':      'Activar',

    'eval.avgAccuracy':  'Exactitud Promedio',
    'eval.avgMae':       'MAE Promedio',
    'eval.products':     'Productos Evaluados',

    'upload.title':    'Subir Datos de Ventas',
    'upload.desc':     'Sube uno o más archivos CSV para agregar datos de ventas. Los pronósticos y decisiones se recalcularán automáticamente.',
    'upload.template': '↓ Descargar Plantilla',
    'upload.format':   'Columnas requeridas:',
    'upload.example':  'ej. 2024-06-15, Cola 330ml, 22',
    'upload.hint':     'Arrastra y suelta archivos CSV aquí, o haz clic para seleccionar',
    'upload.multi':    'Se admiten múltiples archivos',
    'upload.submit':   'Subir y Procesar',
    'upload.clear':    'Limpiar',

    'nav.manual':'Entrada Manual','page.manual':'Entrada de Datos Manual',
    'manual.createProduct':'Crear Producto','manual.createDesc':'Añade un nuevo producto para rastrear sus ventas manualmente.',
    'manual.newProduct':'Nuevo Producto','manual.productName':'Nombre del Producto *','manual.category':'Categoría',
    'manual.currentStock':'Stock Actual','manual.price':'Precio (£, opcional)','manual.createProductBtn':'Crear Producto',
    'manual.yourProducts':'Tus Productos Rastreados Manualmente','manual.noProducts':'Aún no hay productos','manual.noProductsHint':'Haz clic en "Nuevo Producto" para añadir tu primer producto.',
    'manual.workingOn':'Trabajando en','manual.runPipeline':'Generar Pronóstico y Decisión','manual.changeProduct':'Cambiar Producto',
    'manual.addSales':'Añadir Venta','manual.addSalesDesc':'Introduce las unidades vendidas en un día concreto.',
    'manual.date':'Fecha *','manual.unitsSold':'Unidades Vendidas *','manual.saveEntry':'Guardar Entrada','manual.today':'Hoy',
    'manual.timeline':'Historial de Ventas','manual.entryType':'Tipo','manual.manual':'Manual','manual.autoZero':'Relleno auto (0)',
    'manual.daysReady':'días — listo','manual.daysNeeded':'días registrados','manual.inStock':'en stock',
    'manual.lastEntry':'Última entrada','manual.gapsFilled':'días faltantes rellenados con 0',
    'manual.daysProgress':'días registrados','manual.readyToForecast':'¡Listo para pronosticar!',
    'manual.daysRecorded':'días registrados','manual.daysUntilReady':'días más necesarios',
    'manual.days':'días','manual.autoFilled':'relleno auto','manual.noEntries':'Sin entradas aún.',
    'manual.pipelineRunning':'Ejecutando pipeline…','manual.pipelineWithEval':'Pronóstico, decisiones y evaluación completados.',
    'manual.pipelineNoEval':'Pronóstico y decisiones completos. Añade 90+ días para métricas.',
    'manual.selectProductFirst':'Selecciona un producto primero.','manual.errorName':'El nombre del producto es obligatorio.','manual.errorDate':'Selecciona una fecha.','manual.errorUnits':'Las unidades deben ser 0 o más.',

    'yes': 'Sí',
    'no':  'No',
  },

  fr: {
    'nav.overview':'Aperçu','nav.products':'Produits','nav.inventory':'Inventaire','nav.decisions':'Décisions','nav.forecast':'Prévisions','nav.analytics':'Analytique','nav.evaluation':'Évaluation','nav.scenario':'Scénarios','nav.managerSection':'Gestionnaire','nav.logout':'Déconnexion',
    'page.overview':'Aperçu','page.products':'Produits','page.inventory':'Inventaire','page.decisions':'Décisions','page.forecast':'Prévision de la demande','page.analytics':'Analytique','page.evaluation':'Évaluation du modèle','page.scenario':'Comparaison de scénarios',
    'kpi.totalProducts':'Total Produits','kpi.activeProducts':'Produits Actifs','kpi.reorderNow':'Réapprovisionner','kpi.inventoryValue':'Valeur du Stock',
    'card.decisionBreakdown':'Répartition des Décisions','card.riskBreakdown':'Aperçu des Risques','card.salesTrend':'Tendance des Ventes — 30 derniers jours','card.forecastVsActual':'Prévision vs Réel','card.inventoryLevels':'Niveaux de Stock vs Points de Commande','card.scenarioExplain':'Comment fonctionne la comparaison','card.scenarioDesc':'Simulation de 90 jours comparant deux stratégies. Sans système : réactif. Avec système : proactif au point de commande.','card.scenarioChart':'Jours de rupture : Comparaison',
    'th.product':'Produit','th.category':'Catégorie','th.price':'Prix','th.seasonal':'Saisonnier','th.status':'Statut','th.decision':'Décision','th.action':'Action','th.stock':'Stock Actuel','th.stockBar':'Niveau','th.reorderPoint':'Point de Commande','th.risk':'Risque','th.lastUpdated':'Dernière MàJ','th.reason':'Raison','th.forecastDemand':'Demande Prévue','th.safetyStock':'Stock de Sécurité','th.orderQty':'Qté Commande','th.predicted':'Prévu (journalier)','th.actual':'Réel (journalier)','th.mae':'MAE','th.accuracy':'Précision','th.evalPeriod':'Période d\'éval.','th.stockoutWithout':'Jours rupture (Sans)','th.stockoutWith':'Jours rupture (Avec)','th.overstockWithout':'Surstockage (Sans)','th.overstockWith':'Surstockage (Avec)','th.reordersWithout':'Commandes (Sans)','th.reordersWith':'Commandes (Avec)','th.improvement':'Amélioration',
    'search.products':'Rechercher des produits…',
    'action.reorder':'Commander','action.at_risk':'À Risque','action.hold':'Conserver','action.inactive':'Inactif',
    'status.active':'Actif','status.inactive':'Inactif',
    'risk.low':'Faible','risk.medium':'Moyen','risk.high':'Élevé',
    'btn.deactivate':'Désactiver','btn.activate':'Activer',
    'eval.avgAccuracy':'Précision Moy.','eval.avgMae':'MAE Moy.','eval.products':'Produits Évalués',
    'upload.title':'Importer des Données','upload.desc':'Importez un ou plusieurs fichiers CSV. Les prévisions seront recalculées automatiquement.','upload.template':'↓ Télécharger le modèle','upload.format':'Colonnes requises :','upload.example':'ex. 2024-06-15, Cola 330ml, 22','upload.hint':'Glissez-déposez des fichiers CSV ici, ou cliquez pour parcourir','upload.multi':'Plusieurs fichiers acceptés','upload.submit':'Importer et Traiter','upload.clear':'Effacer',
    'nav.manual':'Saisie Manuelle','page.manual':'Saisie Manuelle des Données',
    'manual.createProduct':'Créer un Produit','manual.createDesc':'Ajoutez un nouveau produit pour suivre ses ventes manuellement.',
    'manual.newProduct':'Nouveau Produit','manual.productName':'Nom du Produit *','manual.category':'Catégorie',
    'manual.currentStock':'Stock Actuel','manual.price':'Prix (£, optionnel)','manual.createProductBtn':'Créer le Produit',
    'manual.yourProducts':'Vos Produits Suivis Manuellement','manual.noProducts':'Aucun produit encore','manual.noProductsHint':'Cliquez sur "Nouveau Produit" pour commencer.',
    'manual.workingOn':'En cours','manual.runPipeline':'Générer Prévision et Décision','manual.changeProduct':'Changer de Produit',
    'manual.addSales':'Ajouter une Vente','manual.addSalesDesc':'Entrez les unités vendues pour un jour donné.',
    'manual.date':'Date *','manual.unitsSold':'Unités Vendues *','manual.saveEntry':'Enregistrer','manual.today':'Aujourd\'hui',
    'manual.timeline':'Historique des Ventes','manual.entryType':'Type','manual.manual':'Manuel','manual.autoZero':'Rempli auto (0)',
    'manual.daysReady':'jours — prêt','manual.daysNeeded':'jours enregistrés','manual.inStock':'en stock',
    'manual.lastEntry':'Dernière entrée','manual.gapsFilled':'jours manquants remplis à 0',
    'manual.daysProgress':'jours enregistrés','manual.readyToForecast':'Prêt à prévoir !',
    'manual.daysRecorded':'jours enregistrés','manual.daysUntilReady':'jours supplémentaires requis',
    'manual.days':'jours','manual.autoFilled':'rempli auto','manual.noEntries':'Aucune entrée.',
    'manual.pipelineRunning':'Pipeline en cours…','manual.pipelineWithEval':'Prévision, décisions et évaluation terminées.',
    'manual.pipelineNoEval':'Prévision et décisions terminées. Ajoutez 90+ jours pour les métriques.',
    'manual.selectProductFirst':'Sélectionnez d\'abord un produit.','manual.errorName':'Le nom est obligatoire.','manual.errorDate':'Sélectionnez une date.','manual.errorUnits':'Les unités doivent être ≥ 0.',

    'yes':'Oui','no':'Non',
  },

  de: {
    'nav.overview':'Übersicht','nav.products':'Produkte','nav.inventory':'Inventar','nav.decisions':'Entscheidungen','nav.forecast':'Prognose','nav.analytics':'Analysen','nav.evaluation':'Auswertung','nav.scenario':'Szenarien','nav.managerSection':'Manager','nav.logout':'Abmelden',
    'page.overview':'Übersicht','page.products':'Produkte','page.inventory':'Inventar','page.decisions':'Entscheidungen','page.forecast':'Bedarfsprognose','page.analytics':'Analysen','page.evaluation':'Modellauswertung','page.scenario':'Szenariovergleich',
    'kpi.totalProducts':'Produkte Gesamt','kpi.activeProducts':'Aktive Produkte','kpi.reorderNow':'Nachbestellen','kpi.inventoryValue':'Lagerwert',
    'card.decisionBreakdown':'Entscheidungsübersicht','card.riskBreakdown':'Risikoübersicht','card.salesTrend':'Verkaufstrend — Letzte 30 Tage','card.forecastVsActual':'Prognose vs. Ist','card.inventoryLevels':'Lagerstand vs. Bestellpunkte','card.scenarioExplain':'Wie der Szenariovergleich funktioniert','card.scenarioDesc':'90-Tage-Simulation vergleicht zwei Strategien. Ohne System: reaktiv. Mit System: proaktiv am Bestellpunkt.','card.scenarioChart':'Fehlbestandstage: Vergleich',
    'th.product':'Produkt','th.category':'Kategorie','th.price':'Preis','th.seasonal':'Saisonal','th.status':'Status','th.decision':'Entscheidung','th.action':'Aktion','th.stock':'Aktueller Bestand','th.stockBar':'Niveau','th.reorderPoint':'Bestellpunkt','th.risk':'Risiko','th.lastUpdated':'Letzte Aktualisierung','th.reason':'Grund','th.forecastDemand':'Prognosebedarf','th.safetyStock':'Sicherheitsbestand','th.orderQty':'Bestellmenge','th.predicted':'Prognostiziert (täglich)','th.actual':'Tatsächlich (täglich)','th.mae':'MAE','th.accuracy':'Genauigkeit','th.evalPeriod':'Auswertungszeitraum','th.stockoutWithout':'Fehlbestandstage (Ohne)','th.stockoutWith':'Fehlbestandstage (Mit)','th.overstockWithout':'Überbestand (Ohne)','th.overstockWith':'Überbestand (Mit)','th.reordersWithout':'Bestellungen (Ohne)','th.reordersWith':'Bestellungen (Mit)','th.improvement':'Verbesserung',
    'search.products':'Produkte suchen…',
    'action.reorder':'Nachbestellen','action.at_risk':'Gefährdet','action.hold':'Halten','action.inactive':'Inaktiv',
    'status.active':'Aktiv','status.inactive':'Inaktiv',
    'risk.low':'Niedrig','risk.medium':'Mittel','risk.high':'Hoch',
    'btn.deactivate':'Deaktivieren','btn.activate':'Aktivieren',
    'eval.avgAccuracy':'Ø Genauigkeit','eval.avgMae':'Ø MAE','eval.products':'Ausgewertete Produkte',
    'upload.title':'Verkaufsdaten hochladen','upload.desc':'Laden Sie eine oder mehrere CSV-Dateien hoch. Prognosen werden automatisch neu berechnet.','upload.template':'↓ Vorlage herunterladen','upload.format':'Erforderliche Spalten:','upload.example':'z.B. 2024-06-15, Cola 330ml, 22','upload.hint':'CSV-Dateien hier ablegen oder klicken','upload.multi':'Mehrere Dateien unterstützt','upload.submit':'Hochladen & Verarbeiten','upload.clear':'Löschen',
    'nav.manual':'Manuelle Eingabe','page.manual':'Manuelle Dateneingabe',
    'manual.createProduct':'Produkt erstellen','manual.createDesc':'Fügen Sie ein neues Produkt zur manuellen Verkaufsverfolgung hinzu.',
    'manual.newProduct':'Neues Produkt','manual.productName':'Produktname *','manual.category':'Kategorie',
    'manual.currentStock':'Aktueller Bestand','manual.price':'Preis (£, optional)','manual.createProductBtn':'Produkt erstellen',
    'manual.yourProducts':'Manuell erfasste Produkte','manual.noProducts':'Noch keine Produkte','manual.noProductsHint':'Klicken Sie auf „Neues Produkt", um zu beginnen.',
    'manual.workingOn':'In Bearbeitung','manual.runPipeline':'Prognose & Entscheidung generieren','manual.changeProduct':'Produkt wechseln',
    'manual.addSales':'Verkauf hinzufügen','manual.addSalesDesc':'Geben Sie die verkauften Einheiten für einen bestimmten Tag ein.',
    'manual.date':'Datum *','manual.unitsSold':'Verkaufte Einheiten *','manual.saveEntry':'Speichern','manual.today':'Heute',
    'manual.timeline':'Verkaufshistorie','manual.entryType':'Typ','manual.manual':'Manuell','manual.autoZero':'Auto-gefüllt (0)',
    'manual.daysReady':'Tage — bereit','manual.daysNeeded':'Tage erfasst','manual.inStock':'auf Lager',
    'manual.lastEntry':'Letzter Eintrag','manual.gapsFilled':'fehlende Tage mit 0 aufgefüllt',
    'manual.daysProgress':'Tage erfasst','manual.readyToForecast':'Bereit zur Prognose!',
    'manual.daysRecorded':'Tage erfasst','manual.daysUntilReady':'weitere Tage erforderlich',
    'manual.days':'Tage','manual.autoFilled':'auto-gefüllt','manual.noEntries':'Keine Einträge.',
    'manual.pipelineRunning':'Pipeline läuft…','manual.pipelineWithEval':'Prognose, Entscheidungen und Auswertung abgeschlossen.',
    'manual.pipelineNoEval':'Prognose und Entscheidungen abgeschlossen. 90+ Tage für Metriken.',
    'manual.selectProductFirst':'Bitte zuerst ein Produkt wählen.','manual.errorName':'Produktname ist erforderlich.','manual.errorDate':'Datum wählen.','manual.errorUnits':'Einheiten müssen ≥ 0 sein.',

    'yes':'Ja','no':'Nein',
  },

  pt: {
    'nav.overview':'Visão Geral','nav.products':'Produtos','nav.inventory':'Inventário','nav.decisions':'Decisões','nav.forecast':'Previsão','nav.analytics':'Análises','nav.evaluation':'Avaliação','nav.scenario':'Cenários','nav.managerSection':'Gerente','nav.logout':'Sair',
    'page.overview':'Visão Geral','page.products':'Produtos','page.inventory':'Inventário','page.decisions':'Decisões','page.forecast':'Previsão de Demanda','page.analytics':'Análises','page.evaluation':'Avaliação do Modelo','page.scenario':'Comparação de Cenários',
    'kpi.totalProducts':'Total de Produtos','kpi.activeProducts':'Produtos Ativos','kpi.reorderNow':'Repor Agora','kpi.inventoryValue':'Valor do Estoque',
    'card.decisionBreakdown':'Resumo de Decisões','card.riskBreakdown':'Visão de Risco','card.salesTrend':'Tendência de Vendas — Últimos 30 dias','card.forecastVsActual':'Previsão vs Real','card.inventoryLevels':'Níveis de Estoque vs Pontos de Reposição','card.scenarioExplain':'Como Funciona a Comparação','card.scenarioDesc':'Simulação de 90 dias comparando duas estratégias. Sem sistema: reativo. Com sistema: proativo no ponto de reposição.','card.scenarioChart':'Dias sem Estoque: Comparação',
    'th.product':'Produto','th.category':'Categoria','th.price':'Preço','th.seasonal':'Sazonal','th.status':'Status','th.decision':'Decisão','th.action':'Ação','th.stock':'Estoque Atual','th.stockBar':'Nível','th.reorderPoint':'Ponto de Reposição','th.risk':'Risco','th.lastUpdated':'Última Atualização','th.reason':'Motivo','th.forecastDemand':'Demanda Prevista','th.safetyStock':'Estoque de Segurança','th.orderQty':'Qtd. Pedido','th.predicted':'Previsto (diário)','th.actual':'Real (diário)','th.mae':'MAE','th.accuracy':'Precisão','th.evalPeriod':'Período de Avaliação','th.stockoutWithout':'Dias sem estoque (Sem)','th.stockoutWith':'Dias sem estoque (Com)','th.overstockWithout':'Excesso (Sem)','th.overstockWith':'Excesso (Com)','th.reordersWithout':'Pedidos (Sem)','th.reordersWith':'Pedidos (Com)','th.improvement':'Melhora',
    'search.products':'Buscar produtos…',
    'action.reorder':'Repor','action.at_risk':'Em Risco','action.hold':'Manter','action.inactive':'Inativo',
    'status.active':'Ativo','status.inactive':'Inativo',
    'risk.low':'Baixo','risk.medium':'Médio','risk.high':'Alto',
    'btn.deactivate':'Desativar','btn.activate':'Ativar',
    'eval.avgAccuracy':'Precisão Méd.','eval.avgMae':'MAE Méd.','eval.products':'Produtos Avaliados',
    'upload.title':'Carregar Dados de Vendas','upload.desc':'Carregue um ou mais arquivos CSV. As previsões serão recalculadas automaticamente.','upload.template':'↓ Baixar Modelo','upload.format':'Colunas obrigatórias:','upload.example':'ex. 2024-06-15, Cola 330ml, 22','upload.hint':'Arraste arquivos CSV aqui ou clique para selecionar','upload.multi':'Múltiplos arquivos suportados','upload.submit':'Carregar e Processar','upload.clear':'Limpar',
    'nav.manual':'Entrada Manual','page.manual':'Entrada Manual de Dados',
    'manual.createProduct':'Criar Produto','manual.createDesc':'Adicione um novo produto para rastrear vendas manualmente.',
    'manual.newProduct':'Novo Produto','manual.productName':'Nome do Produto *','manual.category':'Categoria',
    'manual.currentStock':'Estoque Atual','manual.price':'Preço (£, opcional)','manual.createProductBtn':'Criar Produto',
    'manual.yourProducts':'Seus Produtos Rastreados Manualmente','manual.noProducts':'Nenhum produto ainda','manual.noProductsHint':'Clique em "Novo Produto" para começar.',
    'manual.workingOn':'Trabalhando em','manual.runPipeline':'Gerar Previsão e Decisão','manual.changeProduct':'Mudar Produto',
    'manual.addSales':'Adicionar Venda','manual.addSalesDesc':'Insira as unidades vendidas em um dia específico.',
    'manual.date':'Data *','manual.unitsSold':'Unidades Vendidas *','manual.saveEntry':'Salvar Entrada','manual.today':'Hoje',
    'manual.timeline':'Histórico de Vendas','manual.entryType':'Tipo','manual.manual':'Manual','manual.autoZero':'Preenchido auto (0)',
    'manual.daysReady':'dias — pronto','manual.daysNeeded':'dias registrados','manual.inStock':'em estoque',
    'manual.lastEntry':'Última entrada','manual.gapsFilled':'dias ausentes preenchidos com 0',
    'manual.daysProgress':'dias registrados','manual.readyToForecast':'Pronto para prever!',
    'manual.daysRecorded':'dias registrados','manual.daysUntilReady':'dias a mais necessários',
    'manual.days':'dias','manual.autoFilled':'preenchido auto','manual.noEntries':'Sem entradas ainda.',
    'manual.pipelineRunning':'Executando pipeline…','manual.pipelineWithEval':'Previsão, decisões e avaliação concluídas.',
    'manual.pipelineNoEval':'Previsão e decisões concluídas. Adicione 90+ dias para métricas.',
    'manual.selectProductFirst':'Selecione um produto primeiro.','manual.errorName':'O nome é obrigatório.','manual.errorDate':'Selecione uma data.','manual.errorUnits':'Unidades devem ser ≥ 0.',

    'yes':'Sim','no':'Não',
  },

  hi: {
    'nav.overview':'अवलोकन','nav.products':'उत्पाद','nav.inventory':'इन्वेंटरी','nav.decisions':'निर्णय','nav.forecast':'पूर्वानुमान','nav.analytics':'विश्लेषण','nav.evaluation':'मूल्यांकन','nav.scenario':'परिदृश्य','nav.managerSection':'प्रबंधक','nav.logout':'लॉग आउट',
    'page.overview':'अवलोकन','page.products':'उत्पाद','page.inventory':'इन्वेंटरी','page.decisions':'निर्णय','page.forecast':'मांग पूर्वानुमान','page.analytics':'विश्लेषण','page.evaluation':'मॉडल मूल्यांकन','page.scenario':'परिदृश्य तुलना',
    'kpi.totalProducts':'कुल उत्पाद','kpi.activeProducts':'सक्रिय उत्पाद','kpi.reorderNow':'पुनर्ऑर्डर करें','kpi.inventoryValue':'इन्वेंटरी मूल्य',
    'card.decisionBreakdown':'निर्णय सारांश','card.riskBreakdown':'जोखिम अवलोकन','card.salesTrend':'बिक्री प्रवृत्ति — पिछले 30 दिन','card.forecastVsActual':'पूर्वानुमान बनाम वास्तविक','card.inventoryLevels':'इन्वेंटरी स्तर बनाम पुनर्ऑर्डर बिंदु','card.scenarioExplain':'परिदृश्य तुलना कैसे काम करती है','card.scenarioDesc':'90-दिन का सिमुलेशन दो रणनीतियों की तुलना करता है। बिना सिस्टम: प्रतिक्रियाशील। सिस्टम के साथ: सक्रिय।','card.scenarioChart':'स्टॉकआउट दिन: तुलना',
    'th.product':'उत्पाद','th.category':'श्रेणी','th.price':'मूल्य','th.seasonal':'मौसमी','th.status':'स्थिति','th.decision':'निर्णय','th.action':'कार्रवाई','th.stock':'वर्तमान स्टॉक','th.stockBar':'स्तर','th.reorderPoint':'पुनर्ऑर्डर बिंदु','th.risk':'जोखिम','th.lastUpdated':'अंतिम अपडेट','th.reason':'कारण','th.forecastDemand':'पूर्वानुमानित मांग','th.safetyStock':'सुरक्षा स्टॉक','th.orderQty':'ऑर्डर मात्रा','th.predicted':'पूर्वानुमानित (दैनिक)','th.actual':'वास्तविक (दैनिक)','th.mae':'MAE','th.accuracy':'सटीकता','th.evalPeriod':'मूल्यांकन अवधि','th.stockoutWithout':'स्टॉकआउट दिन (बिना)','th.stockoutWith':'स्टॉकआउट दिन (साथ)','th.overstockWithout':'अधिक स्टॉक (बिना)','th.overstockWith':'अधिक स्टॉक (साथ)','th.reordersWithout':'ऑर्डर (बिना)','th.reordersWith':'ऑर्डर (साथ)','th.improvement':'सुधार',
    'search.products':'उत्पाद खोजें…',
    'action.reorder':'पुनर्ऑर्डर','action.at_risk':'जोखिम में','action.hold':'होल्ड','action.inactive':'निष्क्रिय',
    'status.active':'सक्रिय','status.inactive':'निष्क्रिय',
    'risk.low':'कम','risk.medium':'मध्यम','risk.high':'उच्च',
    'btn.deactivate':'निष्क्रिय करें','btn.activate':'सक्रिय करें',
    'eval.avgAccuracy':'औसत सटीकता','eval.avgMae':'औसत MAE','eval.products':'मूल्यांकित उत्पाद',
    'upload.title':'बिक्री डेटा अपलोड करें','upload.desc':'एक या अधिक CSV फ़ाइलें अपलोड करें। पूर्वानुमान और निर्णय स्वचालित रूप से पुनर्गणना होंगे।','upload.template':'↓ टेम्पलेट डाउनलोड करें','upload.format':'आवश्यक कॉलम:','upload.example':'जैसे 2024-06-15, Cola 330ml, 22','upload.hint':'CSV फ़ाइलें यहाँ खींचें और छोड़ें, या ब्राउज़ करने के लिए क्लिक करें','upload.multi':'कई फ़ाइलें समर्थित','upload.submit':'अपलोड और प्रोसेस','upload.clear':'साफ़ करें',
    'nav.manual':'मैन्युअल प्रविष्टि','page.manual':'मैन्युअल डेटा प्रविष्टि',
    'manual.createProduct':'उत्पाद बनाएं','manual.createDesc':'मैन्युअल रूप से बिक्री ट्रैक करने के लिए नया उत्पाद जोड़ें।',
    'manual.newProduct':'नया उत्पाद','manual.productName':'उत्पाद का नाम *','manual.category':'श्रेणी',
    'manual.currentStock':'वर्तमान स्टॉक','manual.price':'मूल्य (£, वैकल्पिक)','manual.createProductBtn':'उत्पाद बनाएं',
    'manual.yourProducts':'आपके मैन्युअल उत्पाद','manual.noProducts':'अभी कोई उत्पाद नहीं','manual.noProductsHint':'पहला उत्पाद जोड़ने के लिए "नया उत्पाद" पर क्लिक करें।',
    'manual.workingOn':'काम हो रहा है','manual.runPipeline':'पूर्वानुमान और निर्णय उत्पन्न करें','manual.changeProduct':'उत्पाद बदलें',
    'manual.addSales':'बिक्री जोड़ें','manual.addSalesDesc':'किसी दिन बेची गई इकाइयाँ दर्ज करें।',
    'manual.date':'दिनांक *','manual.unitsSold':'बेची गई इकाइयाँ *','manual.saveEntry':'प्रविष्टि सहेजें','manual.today':'आज',
    'manual.timeline':'बिक्री टाइमलाइन','manual.entryType':'प्रकार','manual.manual':'मैन्युअल','manual.autoZero':'ऑटो-भरा (0)',
    'manual.daysReady':'दिन — तैयार','manual.daysNeeded':'दिन दर्ज','manual.inStock':'स्टॉक में',
    'manual.lastEntry':'अंतिम प्रविष्टि','manual.gapsFilled':'गायब दिन 0 से भरे',
    'manual.daysProgress':'दिन दर्ज','manual.readyToForecast':'पूर्वानुमान के लिए तैयार!',
    'manual.daysRecorded':'दिन दर्ज','manual.daysUntilReady':'और दिन चाहिए',
    'manual.days':'दिन','manual.autoFilled':'ऑटो-भरा','manual.noEntries':'अभी कोई प्रविष्टि नहीं।',
    'manual.pipelineRunning':'पाइपलाइन चल रही है…','manual.pipelineWithEval':'पूर्वानुमान, निर्णय और मूल्यांकन पूर्ण।',
    'manual.pipelineNoEval':'पूर्वानुमान और निर्णय पूर्ण। मेट्रिक्स के लिए 90+ दिन जोड़ें।',
    'manual.selectProductFirst':'पहले एक उत्पाद चुनें।','manual.errorName':'उत्पाद नाम आवश्यक है।','manual.errorDate':'दिनांक चुनें।','manual.errorUnits':'इकाइयाँ 0 या अधिक होनी चाहिए।',

    'yes':'हाँ','no':'नहीं',
  },

  ur: {
    'nav.overview':'جائزہ','nav.products':'مصنوعات','nav.inventory':'انوینٹری','nav.decisions':'فیصلے','nav.forecast':'پیشگوئی','nav.analytics':'تجزیات','nav.evaluation':'تشخیص','nav.scenario':'منظرنامے','nav.managerSection':'مینیجر','nav.logout':'لاگ آؤٹ',
    'page.overview':'جائزہ','page.products':'مصنوعات','page.inventory':'انوینٹری','page.decisions':'فیصلے','page.forecast':'طلب کی پیشگوئی','page.analytics':'تجزیات','page.evaluation':'ماڈل تشخیص','page.scenario':'منظرنامہ موازنہ',
    'kpi.totalProducts':'کل مصنوعات','kpi.activeProducts':'فعال مصنوعات','kpi.reorderNow':'دوبارہ آرڈر کریں','kpi.inventoryValue':'انوینٹری کی قدر',
    'card.decisionBreakdown':'فیصلوں کا خلاصہ','card.riskBreakdown':'خطرے کا جائزہ','card.salesTrend':'فروخت کا رجحان — گزشتہ 30 دن','card.forecastVsActual':'پیشگوئی بمقابلہ حقیقی','card.inventoryLevels':'انوینٹری کی سطح بمقابلہ ری آرڈر پوائنٹ','card.scenarioExplain':'منظرنامہ موازنہ کیسے کام کرتا ہے','card.scenarioDesc':'90 دن کی سمیولیشن دو حکمت عملیوں کا موازنہ کرتی ہے۔ بغیر نظام: رد عمل۔ نظام کے ساتھ: فعال۔','card.scenarioChart':'اسٹاک آؤٹ دن: موازنہ',
    'th.product':'مصنوع','th.category':'زمرہ','th.price':'قیمت','th.seasonal':'موسمی','th.status':'حالت','th.decision':'فیصلہ','th.action':'عمل','th.stock':'موجودہ اسٹاک','th.stockBar':'سطح','th.reorderPoint':'ری آرڈر پوائنٹ','th.risk':'خطرہ','th.lastUpdated':'آخری اپ ڈیٹ','th.reason':'وجہ','th.forecastDemand':'پیشگوئی طلب','th.safetyStock':'حفاظتی اسٹاک','th.orderQty':'آرڈر مقدار','th.predicted':'پیشگوئی (روزانہ)','th.actual':'حقیقی (روزانہ)','th.mae':'MAE','th.accuracy':'درستگی','th.evalPeriod':'تشخیص کی مدت','th.stockoutWithout':'اسٹاک آؤٹ دن (بغیر)','th.stockoutWith':'اسٹاک آؤٹ دن (ساتھ)','th.overstockWithout':'زائد اسٹاک (بغیر)','th.overstockWith':'زائد اسٹاک (ساتھ)','th.reordersWithout':'آرڈر (بغیر)','th.reordersWith':'آرڈر (ساتھ)','th.improvement':'بہتری',
    'search.products':'مصنوعات تلاش کریں…',
    'action.reorder':'دوبارہ آرڈر','action.at_risk':'خطرے میں','action.hold':'روکیں','action.inactive':'غیر فعال',
    'status.active':'فعال','status.inactive':'غیر فعال',
    'risk.low':'کم','risk.medium':'درمیانہ','risk.high':'زیادہ',
    'btn.deactivate':'غیر فعال کریں','btn.activate':'فعال کریں',
    'eval.avgAccuracy':'اوسط درستگی','eval.avgMae':'اوسط MAE','eval.products':'جانچی گئی مصنوعات',
    'upload.title':'فروخت ڈیٹا اپ لوڈ کریں','upload.desc':'ایک یا زیادہ CSV فائلیں اپ لوڈ کریں۔ پیشگوئیاں خود بخود دوبارہ حساب ہوں گی۔','upload.template':'↓ ٹیمپلیٹ ڈاؤن لوڈ کریں','upload.format':'مطلوبہ کالم:','upload.example':'مثلاً 2024-06-15, Cola 330ml, 22','upload.hint':'CSV فائلیں یہاں ڈریگ کریں یا براؤز کریں','upload.multi':'متعدد فائلیں قابل قبول','upload.submit':'اپ لوڈ اور پروسیس','upload.clear':'صاف کریں',
    'nav.manual':'دستی اندراج','page.manual':'دستی ڈیٹا اندراج',
    'manual.createProduct':'مصنوع بنائیں','manual.createDesc':'مبیعات کو دستی طور پر ٹریک کرنے کے لیے نئی مصنوع شامل کریں۔',
    'manual.newProduct':'نئی مصنوع','manual.productName':'مصنوع کا نام *','manual.category':'زمرہ',
    'manual.currentStock':'موجودہ اسٹاک','manual.price':'قیمت (£، اختیاری)','manual.createProductBtn':'مصنوع بنائیں',
    'manual.yourProducts':'آپ کی دستی مصنوعات','manual.noProducts':'ابھی کوئی مصنوع نہیں','manual.noProductsHint':'پہلی مصنوع شامل کرنے کے لیے "نئی مصنوع" پر کلک کریں۔',
    'manual.workingOn':'کام جاری ہے','manual.runPipeline':'پیشگوئی اور فیصلہ بنائیں','manual.changeProduct':'مصنوع تبدیل کریں',
    'manual.addSales':'فروخت شامل کریں','manual.addSalesDesc':'کسی دن فروخت ہونے والی اکائیاں درج کریں۔',
    'manual.date':'تاریخ *','manual.unitsSold':'فروخت اکائیاں *','manual.saveEntry':'اندراج محفوظ کریں','manual.today':'آج',
    'manual.timeline':'فروخت ٹائم لائن','manual.entryType':'قسم','manual.manual':'دستی','manual.autoZero':'خودکار بھرا (0)',
    'manual.daysReady':'دن — تیار','manual.daysNeeded':'دن ریکارڈ','manual.inStock':'اسٹاک میں',
    'manual.lastEntry':'آخری اندراج','manual.gapsFilled':'لاپتہ دن صفر سے بھرے',
    'manual.daysProgress':'دن ریکارڈ','manual.readyToForecast':'پیشگوئی کے لیے تیار!',
    'manual.daysRecorded':'دن ریکارڈ','manual.daysUntilReady':'مزید دن درکار',
    'manual.days':'دن','manual.autoFilled':'خودکار بھرا','manual.noEntries':'ابھی کوئی اندراج نہیں۔',
    'manual.pipelineRunning':'پائپ لائن چل رہی ہے…','manual.pipelineWithEval':'پیشگوئی، فیصلے اور تشخیص مکمل۔',
    'manual.pipelineNoEval':'پیشگوئی اور فیصلے مکمل۔ میٹرکس کے لیے 90+ دن شامل کریں۔',
    'manual.selectProductFirst':'پہلے مصنوع منتخب کریں۔','manual.errorName':'مصنوع کا نام ضروری ہے۔','manual.errorDate':'تاریخ منتخب کریں۔','manual.errorUnits':'اکائیاں 0 یا اس سے زیادہ ہونی چاہئیں۔',

    'yes':'ہاں','no':'نہیں',
  },

  tr: {
    'nav.overview':'Genel Bakış','nav.products':'Ürünler','nav.inventory':'Envanter','nav.decisions':'Kararlar','nav.forecast':'Tahmin','nav.analytics':'Analitik','nav.evaluation':'Değerlendirme','nav.scenario':'Senaryolar','nav.managerSection':'Yönetici','nav.logout':'Çıkış',
    'page.overview':'Genel Bakış','page.products':'Ürünler','page.inventory':'Envanter','page.decisions':'Kararlar','page.forecast':'Talep Tahmini','page.analytics':'Analitik','page.evaluation':'Model Değerlendirmesi','page.scenario':'Senaryo Karşılaştırması',
    'kpi.totalProducts':'Toplam Ürün','kpi.activeProducts':'Aktif Ürünler','kpi.reorderNow':'Yeniden Sipariş','kpi.inventoryValue':'Stok Değeri',
    'card.decisionBreakdown':'Karar Dağılımı','card.riskBreakdown':'Risk Genel Bakışı','card.salesTrend':'Satış Trendi — Son 30 Gün','card.forecastVsActual':'Tahmin ve Gerçek','card.inventoryLevels':'Stok Seviyeleri ve Yeniden Sipariş Noktaları','card.scenarioExplain':'Senaryo Karşılaştırması Nasıl Çalışır','card.scenarioDesc':'90 günlük simülasyon iki stratejiyi karşılaştırır. Sistem olmadan: reaktif. Sistemle: yeniden sipariş noktasında proaktif.','card.scenarioChart':'Stok Tükenmesi Günleri: Karşılaştırma',
    'th.product':'Ürün','th.category':'Kategori','th.price':'Fiyat','th.seasonal':'Mevsimsel','th.status':'Durum','th.decision':'Karar','th.action':'Eylem','th.stock':'Mevcut Stok','th.stockBar':'Seviye','th.reorderPoint':'Yeniden Sipariş Noktası','th.risk':'Risk','th.lastUpdated':'Son Güncelleme','th.reason':'Neden','th.forecastDemand':'Tahmin Edilen Talep','th.safetyStock':'Emniyet Stoğu','th.orderQty':'Sipariş Miktarı','th.predicted':'Tahmin (günlük)','th.actual':'Gerçek (günlük)','th.mae':'MAE','th.accuracy':'Doğruluk','th.evalPeriod':'Değerlendirme Dönemi','th.stockoutWithout':'Tükenme Günleri (Olmadan)','th.stockoutWith':'Tükenme Günleri (İle)','th.overstockWithout':'Fazla Stok (Olmadan)','th.overstockWith':'Fazla Stok (İle)','th.reordersWithout':'Siparişler (Olmadan)','th.reordersWith':'Siparişler (İle)','th.improvement':'İyileştirme',
    'search.products':'Ürün ara…',
    'action.reorder':'Yeniden Sipariş','action.at_risk':'Risk Altında','action.hold':'Beklet','action.inactive':'Pasif',
    'status.active':'Aktif','status.inactive':'Pasif',
    'risk.low':'Düşük','risk.medium':'Orta','risk.high':'Yüksek',
    'btn.deactivate':'Devre Dışı','btn.activate':'Etkinleştir',
    'eval.avgAccuracy':'Ort. Doğruluk','eval.avgMae':'Ort. MAE','eval.products':'Değerlendirilen Ürünler',
    'upload.title':'Satış Verisi Yükle','upload.desc':'Bir veya daha fazla CSV dosyası yükleyin. Tahminler otomatik olarak yeniden hesaplanacak.','upload.template':'↓ Şablon İndir','upload.format':'Gerekli sütunlar:','upload.example':'örn. 2024-06-15, Cola 330ml, 22','upload.hint':'CSV dosyalarını buraya sürükleyin veya tıklayın','upload.multi':'Birden fazla dosya desteklenir','upload.submit':'Yükle ve İşle','upload.clear':'Temizle',
    'nav.manual':'Manuel Giriş','page.manual':'Manuel Veri Girişi',
    'manual.createProduct':'Ürün Oluştur','manual.createDesc':'Satışlarını manuel takip etmek için yeni ürün ekleyin.',
    'manual.newProduct':'Yeni Ürün','manual.productName':'Ürün Adı *','manual.category':'Kategori',
    'manual.currentStock':'Mevcut Stok','manual.price':'Fiyat (£, isteğe bağlı)','manual.createProductBtn':'Ürün Oluştur',
    'manual.yourProducts':'Manuel Takip Edilen Ürünler','manual.noProducts':'Henüz ürün yok','manual.noProductsHint':'Başlamak için "Yeni Ürün"e tıklayın.',
    'manual.workingOn':'Üzerinde çalışılan','manual.runPipeline':'Tahmin ve Karar Oluştur','manual.changeProduct':'Ürün Değiştir',
    'manual.addSales':'Satış Ekle','manual.addSalesDesc':'Belirli bir gün için satılan birimleri girin.',
    'manual.date':'Tarih *','manual.unitsSold':'Satılan Birimler *','manual.saveEntry':'Kaydı Kaydet','manual.today':'Bugün',
    'manual.timeline':'Satış Zaman Çizelgesi','manual.entryType':'Tür','manual.manual':'Manuel','manual.autoZero':'Otomatik doldurulmuş (0)',
    'manual.daysReady':'gün — hazır','manual.daysNeeded':'gün kayıtlı','manual.inStock':'stokta',
    'manual.lastEntry':'Son giriş','manual.gapsFilled':'eksik gün 0 ile dolduruldu',
    'manual.daysProgress':'gün kayıtlı','manual.readyToForecast':'Tahmine hazır!',
    'manual.daysRecorded':'gün kayıtlı','manual.daysUntilReady':'gün daha gerekli',
    'manual.days':'gün','manual.autoFilled':'otomatik doldurulmuş','manual.noEntries':'Henüz giriş yok.',
    'manual.pipelineRunning':'Pipeline çalışıyor…','manual.pipelineWithEval':'Tahmin, kararlar ve değerlendirme tamamlandı.',
    'manual.pipelineNoEval':'Tahmin ve kararlar tamamlandı. Metrikler için 90+ gün ekleyin.',
    'manual.selectProductFirst':'Önce ürün seçin.','manual.errorName':'Ürün adı zorunludur.','manual.errorDate':'Tarih seçin.','manual.errorUnits':'Birimler ≥ 0 olmalı.',

    'yes':'Evet','no':'Hayır',
  },

  bn: {
    'nav.overview':'সংক্ষিপ্ত বিবরণ','nav.products':'পণ্য','nav.inventory':'ইনভেন্টরি','nav.decisions':'সিদ্ধান্ত','nav.forecast':'পূর্বাভাস','nav.analytics':'বিশ্লেষণ','nav.evaluation':'মূল্যায়ন','nav.scenario':'পরিস্থিতি','nav.managerSection':'ম্যানেজার','nav.logout':'লগ আউট',
    'page.overview':'সংক্ষিপ্ত বিবরণ','page.products':'পণ্য','page.inventory':'ইনভেন্টরি','page.decisions':'সিদ্ধান্ত','page.forecast':'চাহিদা পূর্বাভাস','page.analytics':'বিশ্লেষণ','page.evaluation':'মডেল মূল্যায়ন','page.scenario':'পরিস্থিতি তুলনা',
    'kpi.totalProducts':'মোট পণ্য','kpi.activeProducts':'সক্রিয় পণ্য','kpi.reorderNow':'পুনরায় অর্ডার করুন','kpi.inventoryValue':'ইনভেন্টরি মূল্য',
    'card.decisionBreakdown':'সিদ্ধান্তের সারসংক্ষেপ','card.riskBreakdown':'ঝুঁকির সংক্ষিপ্ত বিবরণ','card.salesTrend':'বিক্রয় প্রবণতা — শেষ ৩০ দিন','card.forecastVsActual':'পূর্বাভাস বনাম বাস্তব','card.inventoryLevels':'ইনভেন্টরি স্তর বনাম পুনর্অর্ডার পয়েন্ট','card.scenarioExplain':'পরিস্থিতি তুলনা কীভাবে কাজ করে','card.scenarioDesc':'৯০ দিনের সিমুলেশন দুটি কৌশল তুলনা করে। সিস্টেম ছাড়া: প্রতিক্রিয়াশীল। সিস্টেমের সাথে: সক্রিয়।','card.scenarioChart':'স্টকআউট দিন: তুলনা',
    'th.product':'পণ্য','th.category':'বিভাগ','th.price':'মূল্য','th.seasonal':'মৌসুমী','th.status':'অবস্থা','th.decision':'সিদ্ধান্ত','th.action':'পদক্ষেপ','th.stock':'বর্তমান স্টক','th.stockBar':'স্তর','th.reorderPoint':'পুনর্অর্ডার পয়েন্ট','th.risk':'ঝুঁকি','th.lastUpdated':'সর্বশেষ আপডেট','th.reason':'কারণ','th.forecastDemand':'পূর্বাভাসিত চাহিদা','th.safetyStock':'নিরাপত্তা স্টক','th.orderQty':'অর্ডার পরিমাণ','th.predicted':'পূর্বাভাসিত (দৈনিক)','th.actual':'বাস্তব (দৈনিক)','th.mae':'MAE','th.accuracy':'নির্ভুলতা','th.evalPeriod':'মূল্যায়ন সময়কাল','th.stockoutWithout':'স্টকআউট দিন (ছাড়া)','th.stockoutWith':'স্টকআউট দিন (সাথে)','th.overstockWithout':'অতিরিক্ত স্টক (ছাড়া)','th.overstockWith':'অতিরিক্ত স্টক (সাথে)','th.reordersWithout':'অর্ডার (ছাড়া)','th.reordersWith':'অর্ডার (সাথে)','th.improvement':'উন্নতি',
    'search.products':'পণ্য খুঁজুন…',
    'action.reorder':'পুনর্অর্ডার','action.at_risk':'ঝুঁকিতে','action.hold':'ধরে রাখুন','action.inactive':'নিষ্ক্রিয়',
    'status.active':'সক্রিয়','status.inactive':'নিষ্ক্রিয়',
    'risk.low':'কম','risk.medium':'মাঝারি','risk.high':'উচ্চ',
    'btn.deactivate':'নিষ্ক্রিয় করুন','btn.activate':'সক্রিয় করুন',
    'eval.avgAccuracy':'গড় নির্ভুলতা','eval.avgMae':'গড় MAE','eval.products':'মূল্যায়িত পণ্য',
    'upload.title':'বিক্রয় ডেটা আপলোড করুন','upload.desc':'এক বা একাধিক CSV ফাইল আপলোড করুন। পূর্বাভাস স্বয়ংক্রিয়ভাবে পুনর্গণনা হবে।','upload.template':'↓ টেমপ্লেট ডাউনলোড করুন','upload.format':'প্রয়োজনীয় কলাম:','upload.example':'যেমন 2024-06-15, Cola 330ml, 22','upload.hint':'CSV ফাইল এখানে টেনে আনুন বা ক্লিক করুন','upload.multi':'একাধিক ফাইল সমর্থিত','upload.submit':'আপলোড ও প্রক্রিয়া করুন','upload.clear':'মুছুন',
    'nav.manual':'ম্যানুয়াল এন্ট্রি','page.manual':'ম্যানুয়াল ডেটা এন্ট্রি',
    'manual.createProduct':'পণ্য তৈরি করুন','manual.createDesc':'ম্যানুয়ালি বিক্রয় ট্র্যাক করতে নতুন পণ্য যোগ করুন।',
    'manual.newProduct':'নতুন পণ্য','manual.productName':'পণ্যের নাম *','manual.category':'বিভাগ',
    'manual.currentStock':'বর্তমান স্টক','manual.price':'মূল্য (£, ঐচ্ছিক)','manual.createProductBtn':'পণ্য তৈরি করুন',
    'manual.yourProducts':'আপনার ম্যানুয়াল পণ্য','manual.noProducts':'এখনো কোন পণ্য নেই','manual.noProductsHint':'শুরু করতে "নতুন পণ্য" ক্লিক করুন।',
    'manual.workingOn':'কাজ চলছে','manual.runPipeline':'পূর্বাভাস ও সিদ্ধান্ত তৈরি করুন','manual.changeProduct':'পণ্য পরিবর্তন করুন',
    'manual.addSales':'বিক্রয় যোগ করুন','manual.addSalesDesc':'নির্দিষ্ট দিনে বিক্রীত একক লিখুন।',
    'manual.date':'তারিখ *','manual.unitsSold':'বিক্রীত একক *','manual.saveEntry':'এন্ট্রি সংরক্ষণ করুন','manual.today':'আজ',
    'manual.timeline':'বিক্রয় টাইমলাইন','manual.entryType':'ধরন','manual.manual':'ম্যানুয়াল','manual.autoZero':'স্বয়ংক্রিয় (0)',
    'manual.daysReady':'দিন — প্রস্তুত','manual.daysNeeded':'দিন রেকর্ড','manual.inStock':'স্টকে',
    'manual.lastEntry':'শেষ এন্ট্রি','manual.gapsFilled':'অনুপস্থিত দিন 0 দিয়ে পূরণ',
    'manual.daysProgress':'দিন রেকর্ড','manual.readyToForecast':'পূর্বাভাসের জন্য প্রস্তুত!',
    'manual.daysRecorded':'দিন রেকর্ড','manual.daysUntilReady':'আরও দিন প্রয়োজন',
    'manual.days':'দিন','manual.autoFilled':'স্বয়ংক্রিয়','manual.noEntries':'এখনো কোন এন্ট্রি নেই।',
    'manual.pipelineRunning':'পাইপলাইন চলছে…','manual.pipelineWithEval':'পূর্বাভাস, সিদ্ধান্ত ও মূল্যায়ন সম্পন্ন।',
    'manual.pipelineNoEval':'পূর্বাভাস ও সিদ্ধান্ত সম্পন্ন। মেট্রিক্সের জন্য ৯০+ দিন যোগ করুন।',
    'manual.selectProductFirst':'প্রথমে পণ্য নির্বাচন করুন।','manual.errorName':'পণ্যের নাম আবশ্যক।','manual.errorDate':'তারিখ নির্বাচন করুন।','manual.errorUnits':'একক ≥ 0 হতে হবে।',

    'yes':'হ্যাঁ','no':'না',
  },

  zh: {
    'nav.overview':'概览','nav.products':'产品','nav.inventory':'库存','nav.decisions':'决策','nav.forecast':'预测','nav.analytics':'分析','nav.evaluation':'评估','nav.scenario':'场景','nav.managerSection':'管理员','nav.logout':'退出登录',
    'page.overview':'概览','page.products':'产品','page.inventory':'库存','page.decisions':'决策','page.forecast':'需求预测','page.analytics':'分析','page.evaluation':'模型评估','page.scenario':'场景对比',
    'kpi.totalProducts':'产品总数','kpi.activeProducts':'活跃产品','kpi.reorderNow':'立即补货','kpi.inventoryValue':'库存价值',
    'card.decisionBreakdown':'决策分布','card.riskBreakdown':'风险概览','card.salesTrend':'销售趋势 — 过去30天','card.forecastVsActual':'预测与实际对比','card.inventoryLevels':'库存水平与再订购点','card.scenarioExplain':'场景对比说明','card.scenarioDesc':'90天模拟对比两种策略。无系统：被动补货。有系统：在再订购点主动补货。','card.scenarioChart':'缺货天数对比',
    'th.product':'产品','th.category':'类别','th.price':'价格','th.seasonal':'季节性','th.status':'状态','th.decision':'决策','th.action':'操作','th.stock':'当前库存','th.stockBar':'水平','th.reorderPoint':'再订购点','th.risk':'风险','th.lastUpdated':'最后更新','th.reason':'原因','th.forecastDemand':'预测需求','th.safetyStock':'安全库存','th.orderQty':'订货量','th.predicted':'预测（日）','th.actual':'实际（日）','th.mae':'MAE','th.accuracy':'准确率','th.evalPeriod':'评估周期','th.stockoutWithout':'缺货天数（无）','th.stockoutWith':'缺货天数（有）','th.overstockWithout':'超储天数（无）','th.overstockWith':'超储天数（有）','th.reordersWithout':'订单数（无）','th.reordersWith':'订单数（有）','th.improvement':'改进',
    'search.products':'搜索产品…',
    'action.reorder':'补货','action.at_risk':'有风险','action.hold':'持有','action.inactive':'非活跃',
    'status.active':'活跃','status.inactive':'非活跃',
    'risk.low':'低','risk.medium':'中','risk.high':'高',
    'btn.deactivate':'停用','btn.activate':'启用',
    'eval.avgAccuracy':'平均准确率','eval.avgMae':'平均MAE','eval.products':'已评估产品',
    'upload.title':'上传销售数据','upload.desc':'上传一个或多个CSV文件以添加销售数据。预测和决策将自动重新计算。','upload.template':'↓ 下载模板','upload.format':'必需列：','upload.example':'例：2024-06-15, Cola 330ml, 22','upload.hint':'将CSV文件拖放至此，或点击浏览','upload.multi':'支持多个文件','upload.submit':'上传并处理','upload.clear':'清除',
    'nav.manual':'手动录入','page.manual':'手动数据录入',
    'manual.createProduct':'创建产品','manual.createDesc':'添加新产品以手动跟踪销售数据。',
    'manual.newProduct':'新产品','manual.productName':'产品名称 *','manual.category':'类别',
    'manual.currentStock':'当前库存','manual.price':'价格（£，可选）','manual.createProductBtn':'创建产品',
    'manual.yourProducts':'手动跟踪的产品','manual.noProducts':'暂无产品','manual.noProductsHint':'点击"新产品"添加您的第一个产品。',
    'manual.workingOn':'正在处理','manual.runPipeline':'生成预测和决策','manual.changeProduct':'更换产品',
    'manual.addSales':'添加销售','manual.addSalesDesc':'输入某天售出的单位数量。',
    'manual.date':'日期 *','manual.unitsSold':'销售单位 *','manual.saveEntry':'保存记录','manual.today':'今天',
    'manual.timeline':'销售时间线','manual.entryType':'类型','manual.manual':'手动','manual.autoZero':'自动填充 (0)',
    'manual.daysReady':'天 — 就绪','manual.daysNeeded':'天已录入','manual.inStock':'库存中',
    'manual.lastEntry':'最后录入','manual.gapsFilled':'缺失天数用0填充',
    'manual.daysProgress':'天已录入','manual.readyToForecast':'可以预测了！',
    'manual.daysRecorded':'天已录入','manual.daysUntilReady':'天还差',
    'manual.days':'天','manual.autoFilled':'自动填充','manual.noEntries':'暂无记录。',
    'manual.pipelineRunning':'运行中…','manual.pipelineWithEval':'预测、决策和评估已完成。',
    'manual.pipelineNoEval':'预测和决策已完成。添加90+天以获得准确度指标。',
    'manual.selectProductFirst':'请先选择产品。','manual.errorName':'产品名称为必填项。','manual.errorDate':'请选择日期。','manual.errorUnits':'销售单位必须≥0。',

    'yes':'是','no':'否',
  },

  id: {
    'nav.overview':'Ikhtisar','nav.products':'Produk','nav.inventory':'Inventaris','nav.decisions':'Keputusan','nav.forecast':'Prakiraan','nav.analytics':'Analitik','nav.evaluation':'Evaluasi','nav.scenario':'Skenario','nav.managerSection':'Manajer','nav.logout':'Keluar',
    'page.overview':'Ikhtisar','page.products':'Produk','page.inventory':'Inventaris','page.decisions':'Keputusan','page.forecast':'Prakiraan Permintaan','page.analytics':'Analitik','page.evaluation':'Evaluasi Model','page.scenario':'Perbandingan Skenario',
    'kpi.totalProducts':'Total Produk','kpi.activeProducts':'Produk Aktif','kpi.reorderNow':'Pesan Ulang Sekarang','kpi.inventoryValue':'Nilai Inventaris',
    'card.decisionBreakdown':'Ringkasan Keputusan','card.riskBreakdown':'Ikhtisar Risiko','card.salesTrend':'Tren Penjualan — 30 Hari Terakhir','card.forecastVsActual':'Prakiraan vs Aktual','card.inventoryLevels':'Level Inventaris vs Titik Pemesanan Ulang','card.scenarioExplain':'Cara Kerja Perbandingan Skenario','card.scenarioDesc':'Simulasi 90 hari membandingkan dua strategi. Tanpa sistem: reaktif. Dengan sistem: proaktif di titik pemesanan ulang.','card.scenarioChart':'Hari Kehabisan Stok: Perbandingan',
    'th.product':'Produk','th.category':'Kategori','th.price':'Harga','th.seasonal':'Musiman','th.status':'Status','th.decision':'Keputusan','th.action':'Tindakan','th.stock':'Stok Saat Ini','th.stockBar':'Level','th.reorderPoint':'Titik Pemesanan Ulang','th.risk':'Risiko','th.lastUpdated':'Terakhir Diperbarui','th.reason':'Alasan','th.forecastDemand':'Permintaan Prakiraan','th.safetyStock':'Stok Pengaman','th.orderQty':'Jml. Pesanan','th.predicted':'Prediksi (harian)','th.actual':'Aktual (harian)','th.mae':'MAE','th.accuracy':'Akurasi','th.evalPeriod':'Periode Evaluasi','th.stockoutWithout':'Hari Kehabisan (Tanpa)','th.stockoutWith':'Hari Kehabisan (Dengan)','th.overstockWithout':'Kelebihan Stok (Tanpa)','th.overstockWith':'Kelebihan Stok (Dengan)','th.reordersWithout':'Pesanan (Tanpa)','th.reordersWith':'Pesanan (Dengan)','th.improvement':'Peningkatan',
    'search.products':'Cari produk…',
    'action.reorder':'Pesan Ulang','action.at_risk':'Berisiko','action.hold':'Tahan','action.inactive':'Tidak Aktif',
    'status.active':'Aktif','status.inactive':'Tidak Aktif',
    'risk.low':'Rendah','risk.medium':'Sedang','risk.high':'Tinggi',
    'btn.deactivate':'Nonaktifkan','btn.activate':'Aktifkan',
    'eval.avgAccuracy':'Akurasi Rata-rata','eval.avgMae':'MAE Rata-rata','eval.products':'Produk Dievaluasi',
    'upload.title':'Unggah Data Penjualan','upload.desc':'Unggah satu atau lebih file CSV. Prakiraan dan keputusan akan dihitung ulang secara otomatis.','upload.template':'↓ Unduh Templat','upload.format':'Kolom yang diperlukan:','upload.example':'mis. 2024-06-15, Cola 330ml, 22','upload.hint':'Seret file CSV ke sini, atau klik untuk menelusuri','upload.multi':'Beberapa file didukung','upload.submit':'Unggah & Proses','upload.clear':'Hapus',
    'nav.manual':'Entri Manual','page.manual':'Entri Data Manual',
    'manual.createProduct':'Buat Produk','manual.createDesc':'Tambahkan produk baru untuk melacak penjualan secara manual.',
    'manual.newProduct':'Produk Baru','manual.productName':'Nama Produk *','manual.category':'Kategori',
    'manual.currentStock':'Stok Saat Ini','manual.price':'Harga (£, opsional)','manual.createProductBtn':'Buat Produk',
    'manual.yourProducts':'Produk yang Dilacak Manual','manual.noProducts':'Belum ada produk','manual.noProductsHint':'Klik "Produk Baru" untuk memulai.',
    'manual.workingOn':'Sedang dikerjakan','manual.runPipeline':'Buat Prakiraan & Keputusan','manual.changeProduct':'Ganti Produk',
    'manual.addSales':'Tambah Penjualan','manual.addSalesDesc':'Masukkan unit yang terjual pada hari tertentu.',
    'manual.date':'Tanggal *','manual.unitsSold':'Unit Terjual *','manual.saveEntry':'Simpan Entri','manual.today':'Hari Ini',
    'manual.timeline':'Riwayat Penjualan','manual.entryType':'Tipe','manual.manual':'Manual','manual.autoZero':'Otomatis (0)',
    'manual.daysReady':'hari — siap','manual.daysNeeded':'hari tercatat','manual.inStock':'tersedia',
    'manual.lastEntry':'Entri terakhir','manual.gapsFilled':'hari kosong diisi dengan 0',
    'manual.daysProgress':'hari tercatat','manual.readyToForecast':'Siap diprakirakan!',
    'manual.daysRecorded':'hari tercatat','manual.daysUntilReady':'hari lagi dibutuhkan',
    'manual.days':'hari','manual.autoFilled':'otomatis','manual.noEntries':'Belum ada entri.',
    'manual.pipelineRunning':'Pipeline berjalan…','manual.pipelineWithEval':'Prakiraan, keputusan, dan evaluasi selesai.',
    'manual.pipelineNoEval':'Prakiraan dan keputusan selesai. Tambah 90+ hari untuk metrik.',
    'manual.selectProductFirst':'Pilih produk terlebih dahulu.','manual.errorName':'Nama produk wajib diisi.','manual.errorDate':'Pilih tanggal.','manual.errorUnits':'Unit harus ≥ 0.',

    'yes':'Ya','no':'Tidak',
  },

  th: {
    'nav.overview':'ภาพรวม','nav.products':'สินค้า','nav.inventory':'คลังสินค้า','nav.decisions':'การตัดสินใจ','nav.forecast':'การพยากรณ์','nav.analytics':'การวิเคราะห์','nav.evaluation':'การประเมิน','nav.scenario':'สถานการณ์','nav.managerSection':'ผู้จัดการ','nav.logout':'ออกจากระบบ',
    'page.overview':'ภาพรวม','page.products':'สินค้า','page.inventory':'คลังสินค้า','page.decisions':'การตัดสินใจ','page.forecast':'การพยากรณ์ความต้องการ','page.analytics':'การวิเคราะห์','page.evaluation':'การประเมินโมเดล','page.scenario':'การเปรียบเทียบสถานการณ์',
    'kpi.totalProducts':'สินค้าทั้งหมด','kpi.activeProducts':'สินค้าที่ใช้งาน','kpi.reorderNow':'สั่งซื้อเพิ่ม','kpi.inventoryValue':'มูลค่าคลังสินค้า',
    'card.decisionBreakdown':'สรุปการตัดสินใจ','card.riskBreakdown':'ภาพรวมความเสี่ยง','card.salesTrend':'แนวโน้มการขาย — 30 วันที่ผ่านมา','card.forecastVsActual':'การพยากรณ์เทียบกับจริง','card.inventoryLevels':'ระดับคลังสินค้าเทียบกับจุดสั่งซื้อ','card.scenarioExplain':'วิธีการทำงานของการเปรียบเทียบสถานการณ์','card.scenarioDesc':'การจำลอง 90 วันเปรียบเทียบสองกลยุทธ์ ไม่มีระบบ: เชิงรับ มีระบบ: เชิงรุกที่จุดสั่งซื้อ','card.scenarioChart':'วันที่สินค้าหมด: การเปรียบเทียบ',
    'th.product':'สินค้า','th.category':'หมวดหมู่','th.price':'ราคา','th.seasonal':'ตามฤดูกาล','th.status':'สถานะ','th.decision':'การตัดสินใจ','th.action':'การดำเนินการ','th.stock':'สต็อกปัจจุบัน','th.stockBar':'ระดับ','th.reorderPoint':'จุดสั่งซื้อใหม่','th.risk':'ความเสี่ยง','th.lastUpdated':'อัปเดตล่าสุด','th.reason':'เหตุผล','th.forecastDemand':'ความต้องการที่พยากรณ์','th.safetyStock':'สต็อกสำรอง','th.orderQty':'จำนวนสั่งซื้อ','th.predicted':'พยากรณ์ (รายวัน)','th.actual':'จริง (รายวัน)','th.mae':'MAE','th.accuracy':'ความแม่นยำ','th.evalPeriod':'ช่วงการประเมิน','th.stockoutWithout':'วันสินค้าหมด (ไม่มี)','th.stockoutWith':'วันสินค้าหมด (มี)','th.overstockWithout':'สต็อกเกิน (ไม่มี)','th.overstockWith':'สต็อกเกิน (มี)','th.reordersWithout':'คำสั่งซื้อ (ไม่มี)','th.reordersWith':'คำสั่งซื้อ (มี)','th.improvement':'การปรับปรุง',
    'search.products':'ค้นหาสินค้า…',
    'action.reorder':'สั่งซื้อใหม่','action.at_risk':'มีความเสี่ยง','action.hold':'รอ','action.inactive':'ไม่ใช้งาน',
    'status.active':'ใช้งาน','status.inactive':'ไม่ใช้งาน',
    'risk.low':'ต่ำ','risk.medium':'ปานกลาง','risk.high':'สูง',
    'btn.deactivate':'ปิดใช้งาน','btn.activate':'เปิดใช้งาน',
    'eval.avgAccuracy':'ความแม่นยำเฉลี่ย','eval.avgMae':'MAE เฉลี่ย','eval.products':'สินค้าที่ประเมิน',
    'upload.title':'อัปโหลดข้อมูลการขาย','upload.desc':'อัปโหลดไฟล์ CSV หนึ่งไฟล์หรือมากกว่า การพยากรณ์จะคำนวณใหม่โดยอัตโนมัติ','upload.template':'↓ ดาวน์โหลดแม่แบบ','upload.format':'คอลัมน์ที่ต้องการ:','upload.example':'เช่น 2024-06-15, Cola 330ml, 22','upload.hint':'ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่อเรียกดู','upload.multi':'รองรับหลายไฟล์','upload.submit':'อัปโหลดและประมวลผล','upload.clear':'ล้าง',
    'nav.manual':'บันทึกด้วยตนเอง','page.manual':'บันทึกข้อมูลด้วยตนเอง',
    'manual.createProduct':'สร้างสินค้า','manual.createDesc':'เพิ่มสินค้าใหม่เพื่อติดตามยอดขายด้วยตนเอง',
    'manual.newProduct':'สินค้าใหม่','manual.productName':'ชื่อสินค้า *','manual.category':'หมวดหมู่',
    'manual.currentStock':'สต็อกปัจจุบัน','manual.price':'ราคา (£, ไม่บังคับ)','manual.createProductBtn':'สร้างสินค้า',
    'manual.yourProducts':'สินค้าที่ติดตามด้วยตนเอง','manual.noProducts':'ยังไม่มีสินค้า','manual.noProductsHint':'คลิก "สินค้าใหม่" เพื่อเริ่มต้น',
    'manual.workingOn':'กำลังทำงานกับ','manual.runPipeline':'สร้างการพยากรณ์และการตัดสินใจ','manual.changeProduct':'เปลี่ยนสินค้า',
    'manual.addSales':'เพิ่มยอดขาย','manual.addSalesDesc':'ป้อนจำนวนหน่วยที่ขายในวันนั้น',
    'manual.date':'วันที่ *','manual.unitsSold':'หน่วยที่ขาย *','manual.saveEntry':'บันทึก','manual.today':'วันนี้',
    'manual.timeline':'ประวัติยอดขาย','manual.entryType':'ประเภท','manual.manual':'ด้วยตนเอง','manual.autoZero':'เติมอัตโนมัติ (0)',
    'manual.daysReady':'วัน — พร้อม','manual.daysNeeded':'วันที่บันทึก','manual.inStock':'ในสต็อก',
    'manual.lastEntry':'รายการล่าสุด','manual.gapsFilled':'วันที่ขาดหายถูกเติม 0',
    'manual.daysProgress':'วันที่บันทึก','manual.readyToForecast':'พร้อมพยากรณ์!',
    'manual.daysRecorded':'วันที่บันทึก','manual.daysUntilReady':'วันที่ต้องการเพิ่ม',
    'manual.days':'วัน','manual.autoFilled':'เติมอัตโนมัติ','manual.noEntries':'ยังไม่มีรายการ',
    'manual.pipelineRunning':'กำลังประมวลผล…','manual.pipelineWithEval':'การพยากรณ์ การตัดสินใจ และการประเมินเสร็จสมบูรณ์',
    'manual.pipelineNoEval':'การพยากรณ์และการตัดสินใจเสร็จสมบูรณ์ เพิ่ม 90+ วันสำหรับเมตริก',
    'manual.selectProductFirst':'กรุณาเลือกสินค้าก่อน','manual.errorName':'ต้องระบุชื่อสินค้า','manual.errorDate':'กรุณาเลือกวันที่','manual.errorUnits':'หน่วยต้องมากกว่าหรือเท่ากับ 0',

    'yes':'ใช่','no':'ไม่',
  },

  vi: {
    'nav.overview':'Tổng quan','nav.products':'Sản phẩm','nav.inventory':'Hàng tồn kho','nav.decisions':'Quyết định','nav.forecast':'Dự báo','nav.analytics':'Phân tích','nav.evaluation':'Đánh giá','nav.scenario':'Kịch bản','nav.managerSection':'Quản lý','nav.logout':'Đăng xuất',
    'page.overview':'Tổng quan','page.products':'Sản phẩm','page.inventory':'Hàng tồn kho','page.decisions':'Quyết định','page.forecast':'Dự báo nhu cầu','page.analytics':'Phân tích','page.evaluation':'Đánh giá mô hình','page.scenario':'So sánh kịch bản',
    'kpi.totalProducts':'Tổng sản phẩm','kpi.activeProducts':'Sản phẩm hoạt động','kpi.reorderNow':'Đặt hàng lại','kpi.inventoryValue':'Giá trị tồn kho',
    'card.decisionBreakdown':'Tóm tắt quyết định','card.riskBreakdown':'Tổng quan rủi ro','card.salesTrend':'Xu hướng bán hàng — 30 ngày qua','card.forecastVsActual':'Dự báo so với thực tế','card.inventoryLevels':'Mức tồn kho so với điểm đặt hàng','card.scenarioExplain':'Cách so sánh kịch bản hoạt động','card.scenarioDesc':'Mô phỏng 90 ngày so sánh hai chiến lược. Không có hệ thống: phản ứng. Có hệ thống: chủ động tại điểm đặt hàng.','card.scenarioChart':'Ngày hết hàng: So sánh',
    'th.product':'Sản phẩm','th.category':'Danh mục','th.price':'Giá','th.seasonal':'Theo mùa','th.status':'Trạng thái','th.decision':'Quyết định','th.action':'Hành động','th.stock':'Tồn kho hiện tại','th.stockBar':'Mức độ','th.reorderPoint':'Điểm đặt hàng lại','th.risk':'Rủi ro','th.lastUpdated':'Cập nhật lần cuối','th.reason':'Lý do','th.forecastDemand':'Nhu cầu dự báo','th.safetyStock':'Tồn kho an toàn','th.orderQty':'Số lượng đặt','th.predicted':'Dự báo (hàng ngày)','th.actual':'Thực tế (hàng ngày)','th.mae':'MAE','th.accuracy':'Độ chính xác','th.evalPeriod':'Kỳ đánh giá','th.stockoutWithout':'Ngày hết hàng (Không)','th.stockoutWith':'Ngày hết hàng (Có)','th.overstockWithout':'Tồn kho dư (Không)','th.overstockWith':'Tồn kho dư (Có)','th.reordersWithout':'Đơn hàng (Không)','th.reordersWith':'Đơn hàng (Có)','th.improvement':'Cải thiện',
    'search.products':'Tìm sản phẩm…',
    'action.reorder':'Đặt lại','action.at_risk':'Có rủi ro','action.hold':'Giữ','action.inactive':'Không hoạt động',
    'status.active':'Hoạt động','status.inactive':'Không hoạt động',
    'risk.low':'Thấp','risk.medium':'Trung bình','risk.high':'Cao',
    'btn.deactivate':'Vô hiệu hóa','btn.activate':'Kích hoạt',
    'eval.avgAccuracy':'Độ chính xác TB','eval.avgMae':'MAE TB','eval.products':'Sản phẩm đã đánh giá',
    'upload.title':'Tải lên dữ liệu bán hàng','upload.desc':'Tải lên một hoặc nhiều tệp CSV. Dự báo sẽ được tính toán lại tự động.','upload.template':'↓ Tải xuống mẫu','upload.format':'Các cột bắt buộc:','upload.example':'vd. 2024-06-15, Cola 330ml, 22','upload.hint':'Kéo thả tệp CSV vào đây, hoặc nhấp để duyệt','upload.multi':'Hỗ trợ nhiều tệp','upload.submit':'Tải lên & Xử lý','upload.clear':'Xóa',
    'nav.manual':'Nhập Thủ Công','page.manual':'Nhập Dữ Liệu Thủ Công',
    'manual.createProduct':'Tạo Sản Phẩm','manual.createDesc':'Thêm sản phẩm mới để theo dõi doanh số thủ công.',
    'manual.newProduct':'Sản Phẩm Mới','manual.productName':'Tên Sản Phẩm *','manual.category':'Danh Mục',
    'manual.currentStock':'Tồn Kho Hiện Tại','manual.price':'Giá (£, tùy chọn)','manual.createProductBtn':'Tạo Sản Phẩm',
    'manual.yourProducts':'Sản Phẩm Theo Dõi Thủ Công','manual.noProducts':'Chưa có sản phẩm nào','manual.noProductsHint':'Nhấp "Sản Phẩm Mới" để bắt đầu.',
    'manual.workingOn':'Đang làm việc với','manual.runPipeline':'Tạo Dự Báo & Quyết Định','manual.changeProduct':'Đổi Sản Phẩm',
    'manual.addSales':'Thêm Doanh Số','manual.addSalesDesc':'Nhập số đơn vị bán được trong một ngày cụ thể.',
    'manual.date':'Ngày *','manual.unitsSold':'Đơn Vị Bán *','manual.saveEntry':'Lưu Mục','manual.today':'Hôm Nay',
    'manual.timeline':'Lịch Sử Doanh Số','manual.entryType':'Loại','manual.manual':'Thủ công','manual.autoZero':'Tự động điền (0)',
    'manual.daysReady':'ngày — sẵn sàng','manual.daysNeeded':'ngày đã ghi','manual.inStock':'trong kho',
    'manual.lastEntry':'Mục cuối cùng','manual.gapsFilled':'ngày thiếu được điền 0',
    'manual.daysProgress':'ngày đã ghi','manual.readyToForecast':'Sẵn sàng dự báo!',
    'manual.daysRecorded':'ngày đã ghi','manual.daysUntilReady':'ngày nữa cần thêm',
    'manual.days':'ngày','manual.autoFilled':'tự động điền','manual.noEntries':'Chưa có mục nào.',
    'manual.pipelineRunning':'Đang chạy pipeline…','manual.pipelineWithEval':'Dự báo, quyết định và đánh giá hoàn tất.',
    'manual.pipelineNoEval':'Dự báo và quyết định hoàn tất. Thêm 90+ ngày để có số liệu độ chính xác.',
    'manual.selectProductFirst':'Vui lòng chọn sản phẩm trước.','manual.errorName':'Tên sản phẩm là bắt buộc.','manual.errorDate':'Vui lòng chọn ngày.','manual.errorUnits':'Đơn vị phải ≥ 0.',

    'yes':'Có','no':'Không',
  },
};

const EXTRA_TRANSLATIONS = {
  en: {
    'home.signIn': 'Sign in',
    'home.startFree': 'Start free ->',
    'home.tag': 'For independent retailers',
    'home.h1a': 'Guessing what to reorder.',
    'home.h1b': 'Know it',
    'home.h1c': 'instantly.',
    'home.sub': 'Upload your sales data. StockLens tells you exactly which products to order, which to watch, and which are fine — before you run out.',
    'home.ctaUpload': 'Upload your first file free ->',
    'home.ctaHow': 'See how it works',
    'home.proof': 'No credit card · Works with any CSV or Excel file · Setup in 2 minutes',
    'home.kpiReorder': 'Reorder now',
    'home.kpiProducts': 'Products',
    'home.kpiStockValue': 'Stock value',
    'home.kpiAccuracy': 'Accuracy',
    'home.mockUrl': 'stocklens.app · Overview',
    'home.mockReorderText': '3 days left. Order 120 units.',
    'home.mockRiskText': 'Getting low. Monitor daily.',
    'home.mockHoldText': '90+ days of stock. Fine.',
    'home.statStockouts': 'fewer stockouts with StockLens',
    'home.statUpload': 'from file upload to first decision',
    'home.statAccuracy': 'forecast accuracy (MASE < 1)',
    'home.problemTag': 'The problem',
    'home.problemTitle': 'Running out of stock costs more than you think',
    'home.problemSub': 'Every stockout is a lost sale. Most small retailers manage inventory with gut feel — and pay for it every week.',
    'home.problem1Title': 'You only reorder when you run out',
    'home.problem1Body': "By the time you notice, it's too late. Lost sales, emergency orders, customers going elsewhere.",
    'home.problem1Arrow': 'StockLens predicts it 7 days early',
    'home.problem2Title': "Your spreadsheet doesn't forecast",
    'home.problem2Body': "A spreadsheet shows the past. It can't tell you what stock you'll need next week.",
    'home.problem2Arrow': 'StockLens runs 4 models automatically',
    'home.problem3Title': 'Enterprise tools cost thousands',
    'home.problem3Body': "SAP and Oracle assume you have a supply chain team. You don't — and you shouldn't need one.",
    'home.problem3Arrow': 'StockLens works on your laptop today',
    'home.howTag': 'How it works',
    'home.howTitle': 'Three steps. No training needed.',
    'home.howSub': 'If you can export from your till or Shopify, you can use StockLens.',
    'home.step1Title': 'Drop in your sales file',
    'home.step1Body': 'Upload any CSV or Excel export. StockLens auto-detects columns, handles messy data, and cleans duplicates. No template needed.',
    'home.step1Chip': 'Works with 60+ column formats · 18+ date formats',
    'home.step2Title': 'Demand is forecast automatically',
    'home.step2Body': "Four models compete on your data. The best one per product wins automatically. Safety stock, reorder point, and EOQ — all calculated from inventory theory.",
    'home.step2Chip': "SMA · WMA · Exponential smoothing · Holt's linear trend",
    'home.step3Title': 'Get one clear decision per product',
    'home.step3Body': 'Every product gets a plain-English verdict with the reasoning attached. StockLens never orders automatically — you stay in control.',
    'home.step3Chip': 'REORDER · AT_RISK · HOLD · with full explanation',
    'home.ctaTitle': 'Stop running out of stock.<br>Start this week.',
    'home.ctaBody': 'Upload one sales file and see your first reorder decisions in under two minutes. No credit card. No spreadsheet.',
    'home.ctaUploadShort': 'Upload my first file ->',
    'home.ctaLogin': 'Sign in to my account',
    'home.ctaNote': 'Free to start · No card required · Works with any file',
    'home.privacy': 'Privacy',
    'home.terms': 'Terms',
    'home.contact': 'Contact',

    'common.language': 'Language',
    'common.copy': 'Copy',
    'auth.backHome': '<- Back to home',
    'auth.signIn': 'Sign in',
    'auth.signInArrow': 'Sign in ->',
    'auth.createAccount': 'Create account',
    'auth.email': 'Email',
    'auth.emailPlaceholder': 'you@yourshop.com',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'Choose a strong password',
    'auth.confirmPassword': 'Confirm password',
    'auth.confirmPasswordPlaceholder': '••••••••',
    'auth.name': 'Your name',
    'auth.namePlaceholder': 'e.g. Sarah',
    'auth.showPassword': 'Show password',
    'auth.loginSubmit': 'Sign in to StockLens',
    'auth.signingIn': 'Signing in…',
    'auth.or': 'or',
    'auth.demo': 'Use demo credentials',
    'auth.noAccount': 'No account?',
    'auth.createFree': 'Create one free ->',
    'auth.haveAccount': 'Have an account?',
    'auth.demoAccounts': 'Demo accounts',
    'auth.manager': 'Manager',
    'auth.staff': 'Staff',
    'auth.inviteNote': 'Have an invite code?',
    'auth.inviteNoteBody': 'Enter it to join your team. Leave blank to create a new company.',
    'auth.inviteCode': 'Invite code',
    'auth.invitePlaceholder': 'e.g. X4K9MQ',
    'auth.optional': '(optional)',
    'auth.registerSubmit': 'Create my account ->',
    'auth.creatingAccount': 'Creating account…',

    'onboarding.navStep': 'Step 2 of 2 — Workspace setup',
    'onboarding.welcomeTitle': 'Welcome to StockLens',
    'onboarding.welcomeSub': "Let's set up your inventory management system in a few steps.",
    'onboarding.feature1Title': 'Data-Driven Decisions',
    'onboarding.feature1Body': 'AI-powered recommendations for reordering and stock optimisation',
    'onboarding.feature2Title': 'Forecast Accuracy',
    'onboarding.feature2Body': 'Advanced models (SMA, WMA, SES, Holt) tailored to your data',
    'onboarding.feature3Title': 'ABC-XYZ Analysis',
    'onboarding.feature3Body': 'Classify inventory by value and variability for smarter prioritisation',
    'onboarding.getStarted': 'Get Started ->',
    'onboarding.workspaceTitle': 'Set up your workspace',
    'onboarding.workspaceSub': "Give your company a name so your team can find you. You'll be the manager with full access.",
    'onboarding.companyName': 'Company name',
    'onboarding.companyPlaceholder': 'e.g. BrightMart',
    'onboarding.roleLabel': 'Your role in the business',
    'onboarding.managerOwner': 'Manager / Owner',
    'onboarding.managerBody': 'Full access — upload data, run forecasts, manage team',
    'onboarding.staffMember': 'Staff member',
    'onboarding.staffBody': 'View inventory and decisions read-only',
    'onboarding.industry': 'Industry',
    'onboarding.description': 'Description',
    'onboarding.descriptionPlaceholder': 'Short business description',
    'onboarding.createWorkspace': 'Create workspace and continue ->',
    'onboarding.joinExisting': 'Join an existing company instead ->',
    'onboarding.doneTitle': "You're all set!",
    'onboarding.doneSub': 'Your StockLens workspace is ready. Invite your team using the code below.',
    'onboarding.yourInviteCode': 'Your Invite Code',
    'onboarding.goDashboard': 'Go to Dashboard ->',
    'onboarding.settingUp': 'Setting up…',
    'industry.grocery': 'Grocery',
    'industry.pharmacy': 'Pharmacy',
    'industry.clothing': 'Clothing',
    'industry.electronics': 'Electronics',
    'industry.generalRetail': 'General Retail',
    'industry.other': 'Other',

    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.edit': 'Edit',
    'common.back': 'Back',
    'common.preview': 'Preview',
    'common.saveChanges': 'Save Changes',
    'common.loading': 'Loading…',
    'common.running': 'Running…',
    'common.uploading': 'Uploading…',
    'common.complete': 'Complete',
    'common.failed': 'Failed',
    'common.noRecentActivity': 'No recent activity.',
    'common.privacy': 'Privacy',
    'common.terms': 'Terms',
    'common.contact': 'Contact',
    'btn.signIn': 'Sign in',
    'btn.startFree': 'Start free ->',
    'btn.backHome': '<- Back to home',
    'btn.createAccount': 'Create account',
    'btn.confirmDelivery': 'Confirm Delivery',
    'btn.confirmOrder': 'Confirm Order',
    'btn.pendingDelivery': 'Pending Delivery',
    'btn.orderPlaced': 'Order Placed',
    'btn.viewConfirm': 'View & Confirm ->',
    'btn.confirmDeliveries': 'Confirm Deliveries ->',
    'btn.uploadCleanerData': 'Upload cleaner data',
    'btn.checkInventory': 'Check inventory',
    'btn.generateInvite': 'Generate Invite Code',
    'btn.rerunPipeline': 'Re-run Pipeline',

    'modal.pendingOrders': 'Pending Orders — Confirm Deliveries',
    'modal.editPending': 'Edit Pending Reorder',
    'modal.confirmDelivery': 'Confirm Delivery',
    'modal.logReorder': 'Log Reorder Placed',
    'modal.decisionHistory': 'Decision History',
    'decision.viewDecisions': 'View {action} decisions',
    'field.quantityOrdered': 'Quantity ordered',
    'field.expectedDeliveryDays': 'Expected delivery in days',
    'field.notes': 'Notes',
    'field.quantityReceived': 'Quantity received',

    'msg.noPendingOrders': 'No pending orders.',
    'msg.noProductsFound': 'No products found.',
    'msg.noInventoryRows': 'No inventory rows found.',
    'msg.noInventoryData': 'No inventory data yet',
    'msg.noForecastData': 'No forecast data yet',
    'msg.noEvaluationData': 'No evaluation data yet',
    'msg.noClassificationData': 'No classification data yet',
    'msg.noUploadsYet': 'No uploads yet',
    'msg.noLowStockAlerts': 'No low-stock alerts.',
    'msg.noUrgentTasks': 'No urgent reorder, data quality, or delivery tasks need attention right now.',
    'msg.noReason': 'No reason provided',
    'msg.noReasonPeriod': 'No reason provided.',
    'msg.noData': 'No data',
    'msg.noResultsReturned': 'No results returned.',
    'msg.simulationFailed': 'Simulation failed.',
    'msg.uploadFailed': 'Upload failed',
    'msg.uploadTimeout': 'Upload timed out after 120 seconds.',
    'msg.networkError': 'Network error. Is the server running?',
    'msg.failedLoadHistory': 'Failed to load history',
    'msg.failedLoadTeam': 'Failed to load team.',
    'msg.generatingInvite': 'Generating invite code...',
    'msg.inviteReady': 'Invite code ready.',
    'msg.inviteFailed': 'Could not generate invite code.',
    'msg.pipelineRunning': 'Running full company pipeline...',
    'msg.pipelineComplete': 'Pipeline complete',
    'msg.pipelineFailed': 'Pipeline failed.',
    'msg.roleUpdated': 'Role updated.',
    'msg.roleUpdateFailed': 'Failed to update role.',
    'msg.userDeactivated': 'User deactivated.',
    'msg.userDeactivateFailed': 'Failed to deactivate user.',
    'msg.pendingOrderUpdated': 'Pending reorder updated.',
    'msg.pendingOrderUpdateFailed': 'Failed to update pending reorder.',
    'msg.deliveryConfirmed': 'Delivery confirmed and stock updated.',
    'msg.deliveryFailed': 'Failed to confirm delivery.',
    'msg.reorderLogged': 'Reorder logged.',
    'msg.reorderFailed': 'Failed to log reorder.',
    'msg.validQuantity': 'Please enter a valid quantity.',
    'msg.validQuantityDelivery': 'Please enter a valid quantity and delivery window.',
    'msg.loginRequired': 'Please enter both email and password.',
    'msg.loginFailed': 'Login failed.',
    'msg.requiredFields': 'Please complete all required fields.',
    'msg.passwordMismatch': 'Passwords do not match.',
    'msg.passwordLength': 'Password must be at least 8 characters.',
    'msg.registrationFailed': 'Registration failed.',
    'msg.companyRequired': 'Company name is required.',
    'msg.companyCreateFailed': 'Unable to create company',
    'msg.copiedClipboard': 'Copied to clipboard!',
    'msg.serverError': 'Server error. Please try again.',
    'msg.decisionHistoryFailed': 'Could not load decision history.',
    'msg.noHistoryYet': 'No history yet.',
  },
  es: {
    'home.signIn': 'Iniciar sesión', 'home.startFree': 'Empezar gratis ->', 'home.tag': 'Para minoristas independientes',
    'home.h1a': 'Deja de adivinar qué reponer.', 'home.h1b': 'Sábelo', 'home.h1c': 'al instante.',
    'home.sub': 'Sube tus ventas. StockLens te dice qué pedir, qué vigilar y qué está bien antes de quedarte sin stock.',
    'home.ctaUpload': 'Subir mi primer archivo gratis ->', 'home.ctaHow': 'Ver cómo funciona', 'home.proof': 'Sin tarjeta · Funciona con CSV o Excel · Configuración en 2 minutos',
    'home.kpiReorder': 'Reponer ahora', 'home.kpiProducts': 'Productos', 'home.kpiStockValue': 'Valor de stock', 'home.kpiAccuracy': 'Precisión',
    'home.problemTag': 'El problema', 'home.problemTitle': 'Quedarte sin stock cuesta más de lo que crees', 'home.problemSub': 'Cada rotura de stock es una venta perdida. Muchos comercios gestionan inventario por intuición.',
    'home.problem1Title': 'Solo repones cuando se agota', 'home.problem1Body': 'Cuando te das cuenta, ya es tarde. Ventas perdidas, pedidos urgentes y clientes que se van.', 'home.problem1Arrow': 'StockLens lo predice 7 días antes',
    'home.problem2Title': 'Tu hoja de cálculo no pronostica', 'home.problem2Body': 'Una hoja muestra el pasado. No dice qué stock necesitarás la próxima semana.', 'home.problem2Arrow': 'StockLens ejecuta 4 modelos automáticamente',
    'home.problem3Title': 'Las herramientas empresariales cuestan miles', 'home.problem3Body': 'SAP y Oracle suponen que tienes un equipo de cadena de suministro. No lo tienes, y no deberías necesitarlo.', 'home.problem3Arrow': 'StockLens funciona hoy en tu portátil',
    'home.howTag': 'Cómo funciona', 'home.howTitle': 'Tres pasos. Sin formación.', 'home.howSub': 'Si puedes exportar desde tu caja o Shopify, puedes usar StockLens.',
    'home.step1Title': 'Carga tu archivo de ventas', 'home.step1Body': 'Sube cualquier CSV o Excel. StockLens detecta columnas, limpia datos y omite duplicados.', 'home.step1Chip': '60+ formatos de columnas · 18+ formatos de fecha',
    'home.step2Title': 'La demanda se pronostica automáticamente', 'home.step2Body': 'Cuatro modelos compiten con tus datos. Gana el mejor por producto.', 'home.step2Chip': 'SMA · WMA · Suavizado exponencial · Tendencia Holt',
    'home.step3Title': 'Una decisión clara por producto', 'home.step3Body': 'Cada producto recibe un veredicto claro con el razonamiento. StockLens nunca compra automáticamente.', 'home.step3Chip': 'REORDER · AT_RISK · HOLD · explicación completa',
    'home.ctaTitle': 'Deja de quedarte sin stock.<br>Empieza esta semana.', 'home.ctaBody': 'Sube un archivo de ventas y obtén decisiones en menos de dos minutos.', 'home.ctaLogin': 'Entrar a mi cuenta', 'home.ctaNote': 'Gratis para empezar · Sin tarjeta · Funciona con cualquier archivo',
    'home.ctaUploadShort': 'Subir mi primer archivo ->',
    'auth.backHome': '<- Volver al inicio','auth.signIn':'Iniciar sesión','auth.createAccount':'Crear cuenta','auth.email':'Correo','auth.password':'Contraseña','auth.confirmPassword':'Confirmar contraseña','auth.name':'Tu nombre','auth.loginSubmit':'Entrar en StockLens','auth.or':'o','auth.demo':'Usar demo','auth.noAccount':'¿Sin cuenta?','auth.createFree':'Crear una gratis ->','auth.haveAccount':'¿Ya tienes cuenta?','auth.demoAccounts':'Cuentas demo','auth.manager':'Gerente','auth.staff':'Personal','auth.inviteNote':'¿Tienes un código?','auth.inviteNoteBody':'Úsalo para unirte a tu equipo. Déjalo vacío para crear empresa.','auth.inviteCode':'Código de invitación','auth.optional':'(opcional)','auth.registerSubmit':'Crear mi cuenta ->'
  },
  fr: {
    'home.signIn':'Connexion','home.startFree':'Commencer gratuitement ->','home.tag':'Pour les commerçants indépendants','home.h1a':'Deviner quoi recommander.','home.h1b':'Sachez-le','home.h1c':'instantanément.','home.sub':'Importez vos ventes. StockLens indique quoi commander, surveiller ou laisser tel quel avant la rupture.','home.ctaUpload':'Importer mon premier fichier ->','home.ctaHow':'Voir le fonctionnement','home.proof':'Sans carte · CSV ou Excel · Configuration en 2 minutes','home.problemTag':'Le problème','home.problemTitle':'Les ruptures coûtent plus que vous ne pensez','home.problemSub':'Chaque rupture est une vente perdue.','home.howTag':'Fonctionnement','home.howTitle':'Trois étapes. Aucune formation.','home.howSub':'Si vous pouvez exporter vos ventes, vous pouvez utiliser StockLens.','home.ctaTitle':'Arrêtez les ruptures.<br>Commencez cette semaine.','home.ctaBody':'Importez un fichier et obtenez vos premières décisions en moins de deux minutes.','home.ctaLogin':'Me connecter','auth.signIn':'Connexion','auth.createAccount':'Créer un compte','auth.email':'E-mail','auth.password':'Mot de passe','auth.loginSubmit':'Se connecter à StockLens','auth.or':'ou','auth.demo':'Utiliser la démo','auth.backHome':'<- Retour accueil'
  },
  de: {'home.signIn':'Anmelden','home.startFree':'Kostenlos starten ->','home.tag':'Für unabhängige Händler','home.h1a':'Raten, was nachbestellt werden muss.','home.h1b':'Wissen Sie es','home.h1c':'sofort.','home.sub':'Laden Sie Verkaufsdaten hoch. StockLens sagt, was bestellt, beobachtet oder gehalten werden soll.','home.ctaUpload':'Erste Datei kostenlos hochladen ->','home.ctaHow':'So funktioniert es','home.problemTag':'Das Problem','home.howTag':'So funktioniert es','auth.signIn':'Anmelden','auth.createAccount':'Konto erstellen','auth.email':'E-Mail','auth.password':'Passwort','auth.loginSubmit':'Bei StockLens anmelden','auth.or':'oder','auth.demo':'Demo verwenden','auth.backHome':'<- Zurück'},
  pt: {'home.signIn':'Entrar','home.startFree':'Começar grátis ->','home.tag':'Para varejistas independentes','home.h1a':'Adivinhar o que repor.','home.h1b':'Saiba','home.h1c':'na hora.','home.sub':'Envie suas vendas. O StockLens informa o que pedir, observar ou manter antes de faltar.','home.ctaUpload':'Enviar primeiro arquivo grátis ->','home.ctaHow':'Ver como funciona','home.problemTag':'O problema','home.howTag':'Como funciona','auth.signIn':'Entrar','auth.createAccount':'Criar conta','auth.email':'E-mail','auth.password':'Senha','auth.loginSubmit':'Entrar no StockLens','auth.or':'ou','auth.demo':'Usar demonstração','auth.backHome':'<- Voltar'},
  zh: {'home.signIn':'登录','home.startFree':'免费开始 ->','home.tag':'面向独立零售商','home.h1a':'不再猜测补货。','home.h1b':'立即','home.h1c':'知道。','home.sub':'上传销售数据。StockLens 会告诉你要订购、观察或保持哪些产品。','home.ctaUpload':'免费上传第一个文件 ->','home.ctaHow':'查看工作方式','home.problemTag':'问题','home.howTag':'工作方式','auth.signIn':'登录','auth.createAccount':'创建账户','auth.email':'邮箱','auth.password':'密码','auth.loginSubmit':'登录 StockLens','auth.or':'或','auth.demo':'使用演示账户','auth.backHome':'<- 返回首页'},
  ar: {'home.signIn':'تسجيل الدخول','home.startFree':'ابدأ مجاناً ->','home.tag':'للمتاجر المستقلة','home.h1a':'تخمين ما يجب إعادة طلبه.','home.h1b':'اعرفه','home.h1c':'فوراً.','home.sub':'ارفع بيانات المبيعات. يخبرك StockLens بما يجب طلبه أو مراقبته قبل نفاد المخزون.','home.ctaUpload':'ارفع أول ملف مجاناً ->','home.ctaHow':'كيف يعمل','home.problemTag':'المشكلة','home.howTag':'كيف يعمل','auth.signIn':'تسجيل الدخول','auth.createAccount':'إنشاء حساب','auth.email':'البريد الإلكتروني','auth.password':'كلمة المرور','auth.loginSubmit':'تسجيل الدخول إلى StockLens','auth.or':'أو','auth.demo':'استخدام بيانات تجريبية','auth.backHome':'<- العودة للرئيسية'}
  ,
  hi: {'home.signIn':'साइन इन','home.startFree':'मुफ़्त शुरू करें ->','home.tag':'स्वतंत्र खुदरा विक्रेताओं के लिए','home.h1a':'क्या पुनः ऑर्डर करना है, इसका अनुमान।','home.h1b':'इसे जानें','home.h1c':'तुरंत।','home.sub':'अपना बिक्री डेटा अपलोड करें। StockLens बताता है कि क्या ऑर्डर करना है, क्या देखना है और क्या ठीक है।','home.ctaUpload':'पहली फ़ाइल मुफ़्त अपलोड करें ->','home.ctaHow':'देखें कैसे काम करता है','home.problemTag':'समस्या','home.howTag':'कैसे काम करता है','auth.signIn':'साइन इन','auth.createAccount':'खाता बनाएँ','auth.email':'ईमेल','auth.password':'पासवर्ड','auth.loginSubmit':'StockLens में साइन इन करें','auth.or':'या','auth.demo':'डेमो क्रेडेंशियल इस्तेमाल करें','auth.backHome':'<- होम पर वापस'},
  ur: {'home.signIn':'سائن ان','home.startFree':'مفت شروع کریں ->','home.tag':'آزاد ریٹیلرز کے لیے','home.h1a':'کیا دوبارہ آرڈر کرنا ہے، اندازہ لگانا۔','home.h1b':'اسے جانیں','home.h1c':'فوراً۔','home.sub':'اپنا سیلز ڈیٹا اپ لوڈ کریں۔ StockLens بتاتا ہے کیا آرڈر، کیا مانیٹر، اور کیا ٹھیک ہے۔','home.ctaUpload':'پہلی فائل مفت اپ لوڈ کریں ->','home.ctaHow':'دیکھیں کیسے کام کرتا ہے','home.problemTag':'مسئلہ','home.howTag':'یہ کیسے کام کرتا ہے','auth.signIn':'سائن ان','auth.createAccount':'اکاؤنٹ بنائیں','auth.email':'ای میل','auth.password':'پاس ورڈ','auth.loginSubmit':'StockLens میں سائن ان','auth.or':'یا','auth.demo':'ڈیمو استعمال کریں','auth.backHome':'<- ہوم پر واپس'},
  tr: {'home.signIn':'Giriş yap','home.startFree':'Ücretsiz başla ->','home.tag':'Bağımsız perakendeciler için','home.h1a':'Ne sipariş edileceğini tahmin etmek.','home.h1b':'Bunu bilin','home.h1c':'anında.','home.sub':'Satış verinizi yükleyin. StockLens ne sipariş edileceğini, neyin izleneceğini ve neyin iyi olduğunu söyler.','home.ctaUpload':'İlk dosyanı ücretsiz yükle ->','home.ctaHow':'Nasıl çalışır','home.problemTag':'Sorun','home.howTag':'Nasıl çalışır','auth.signIn':'Giriş yap','auth.createAccount':'Hesap oluştur','auth.email':'E-posta','auth.password':'Şifre','auth.loginSubmit':'StockLens’e giriş yap','auth.or':'veya','auth.demo':'Demo bilgilerini kullan','auth.backHome':'<- Ana sayfaya dön'},
  bn: {'home.signIn':'সাইন ইন','home.startFree':'বিনামূল্যে শুরু করুন ->','home.tag':'স্বাধীন খুচরা বিক্রেতাদের জন্য','home.h1a':'কী পুনরায় অর্ডার করবেন তা অনুমান।','home.h1b':'জেনে নিন','home.h1c':'তাৎক্ষণিকভাবে।','home.sub':'আপনার বিক্রয় ডেটা আপলোড করুন। StockLens বলে কী অর্ডার, কী নজরদারি, আর কী ঠিক আছে।','home.ctaUpload':'প্রথম ফাইল বিনামূল্যে আপলোড করুন ->','home.ctaHow':'কীভাবে কাজ করে','home.problemTag':'সমস্যা','home.howTag':'কীভাবে কাজ করে','auth.signIn':'সাইন ইন','auth.createAccount':'অ্যাকাউন্ট তৈরি','auth.email':'ইমেল','auth.password':'পাসওয়ার্ড','auth.loginSubmit':'StockLens-এ সাইন ইন','auth.or':'অথবা','auth.demo':'ডেমো ব্যবহার করুন','auth.backHome':'<- হোমে ফিরে যান'},
  id: {'home.signIn':'Masuk','home.startFree':'Mulai gratis ->','home.tag':'Untuk retailer independen','home.h1a':'Menebak apa yang harus dipesan ulang.','home.h1b':'Ketahui','home.h1c':'seketika.','home.sub':'Unggah data penjualan. StockLens memberi tahu apa yang harus dipesan, dipantau, atau aman.','home.ctaUpload':'Unggah file pertama gratis ->','home.ctaHow':'Lihat cara kerja','home.problemTag':'Masalah','home.howTag':'Cara kerja','auth.signIn':'Masuk','auth.createAccount':'Buat akun','auth.email':'Email','auth.password':'Kata sandi','auth.loginSubmit':'Masuk ke StockLens','auth.or':'atau','auth.demo':'Gunakan demo','auth.backHome':'<- Kembali'},
  th: {'home.signIn':'เข้าสู่ระบบ','home.startFree':'เริ่มใช้ฟรี ->','home.tag':'สำหรับผู้ค้าปลีกอิสระ','home.h1a':'เดาว่าควรสั่งอะไรเพิ่ม','home.h1b':'รู้ได้','home.h1c':'ทันที','home.sub':'อัปโหลดข้อมูลการขาย StockLens จะบอกว่าสินค้าใดควรสั่งซื้อ เฝ้าดู หรือยังปกติ','home.ctaUpload':'อัปโหลดไฟล์แรกฟรี ->','home.ctaHow':'ดูวิธีทำงาน','home.problemTag':'ปัญหา','home.howTag':'วิธีทำงาน','auth.signIn':'เข้าสู่ระบบ','auth.createAccount':'สร้างบัญชี','auth.email':'อีเมล','auth.password':'รหัสผ่าน','auth.loginSubmit':'เข้าสู่ StockLens','auth.or':'หรือ','auth.demo':'ใช้บัญชีทดลอง','auth.backHome':'<- กลับหน้าแรก'},
  vi: {'home.signIn':'Đăng nhập','home.startFree':'Bắt đầu miễn phí ->','home.tag':'Cho nhà bán lẻ độc lập','home.h1a':'Đoán cần đặt lại gì.','home.h1b':'Biết ngay','home.h1c':'lập tức.','home.sub':'Tải dữ liệu bán hàng lên. StockLens cho biết nên đặt gì, theo dõi gì và mặt hàng nào ổn.','home.ctaUpload':'Tải tệp đầu tiên miễn phí ->','home.ctaHow':'Xem cách hoạt động','home.problemTag':'Vấn đề','home.howTag':'Cách hoạt động','auth.signIn':'Đăng nhập','auth.createAccount':'Tạo tài khoản','auth.email':'Email','auth.password':'Mật khẩu','auth.loginSubmit':'Đăng nhập StockLens','auth.or':'hoặc','auth.demo':'Dùng tài khoản demo','auth.backHome':'<- Về trang chủ'}
};

Object.entries(EXTRA_TRANSLATIONS).forEach(([lang, patch]) => {
  window.TRANSLATIONS[lang] = Object.assign(window.TRANSLATIONS[lang] || {}, patch);
});

const SUPPLEMENTAL_TRANSLATIONS = {
  en: {
    'common.dashboardPreview': 'StockLens dashboard preview',
    'common.toggleSidebar': 'Toggle sidebar',
    'common.toggleTheme': 'Toggle theme',
    'common.dismiss': 'Dismiss',
    'common.continue': 'Continue',
    'common.units': 'units',
    'common.unitsPerDay': 'u/day',
    'common.days': 'days',
    'common.day': 'day',
    'common.recently': 'Recently',
    'common.justNow': 'Just now',
    'common.yesterday': 'Yesterday',

    'search.manualProduct': 'e.g. Cola 330ml',
    'search.manualCategory': 'Auto-filled, editable',

    'upload.history': 'Upload History',
    'upload.preview': 'Preview',
    'upload.confirm': 'Confirm & Upload',
    'upload.cleaningApplied': 'Data Cleaning Applied',
    'upload.rowsAccepted': 'Rows accepted',
    'upload.duplicatesRemoved': 'Duplicates removed',
    'upload.negativesRemoved': 'Negatives removed',
    'upload.stockLevelsUpdated': 'Stock levels updated',
    'upload.newProductsCreated': 'New products created',
    'upload.rowsInserted': '{count} rows inserted',
    'upload.duplicatesSkipped': '{count} duplicates skipped',
    'upload.returnsSkipped': '{count} returns/negatives removed',
    'upload.stockUpdated': '{count} stock levels updated',
    'upload.newProducts': 'new: {names}',
    'upload.quality': 'Data quality:',
    'upload.qualityNotes': '{count} data quality note{plural}',
    'upload.renameColumns': 'Rename your columns to:',
    'upload.detectedColumns': '{file}: found columns [{columns}]',
    'upload.detectedMapping': 'Detected -> date: {date} · product: {product} · units: {units}',
    'upload.noColumnsMatched': 'No columns matched',
    'upload.noPreviewRows': 'No previewable rows',
    'upload.previewFailed': 'Preview failed — check that the server is running.',
    'upload.stageUploading': 'Uploading files',
    'upload.stageCleaning': 'Validating & cleaning',
    'upload.stageInventory': 'Updating inventory',
    'upload.stageForecast': 'Running forecast model',
    'upload.stageDecisions': 'Generating decisions',
    'upload.stageFinalising': 'Finalising',

    'overview.welcomeTitle': 'Welcome to StockLens, {name}!',
    'overview.welcomeManager': 'Get started by uploading your sales data. StockLens will automatically generate demand forecasts and reorder decisions.',
    'overview.welcomeStaff': 'Your inventory dashboard is ready. Check stock levels and see the latest reorder decisions.',
    'overview.stepUpload': 'Upload sales CSV',
    'overview.stepForecast': 'Run forecast',
    'overview.stepDecisions': 'Review decisions',
    'overview.stepInventory': 'Check inventory',
    'overview.stepAlerts': 'Review alerts',
    'overview.stepAnalytics': 'Review analytics',
    'overview.todayTitle': "Today's action plan",
    'overview.todaySub': 'The next steps StockLens recommends before you move on.',
    'overview.todayGoodTitle': 'Today looks under control',
    'overview.confirmDeliveries': 'Confirm deliveries',
    'overview.pendingOrders': '{count} pending order{plural}',
    'overview.placeReorder': 'Place reorder',
    'overview.productsNeedAction': '{count} product{plural} need action',
    'overview.reviewAtRisk': 'Review at-risk stock',
    'overview.productsNearReorder': '{count} product{plural} close to reorder point',
    'overview.fixDataQuality': 'Fix data quality',
    'overview.noForecastRun': 'No forecast run yet',
    'overview.forecastNotRun': 'Forecast has not been run yet',
    'overview.dataOutdated': 'data may be outdated',
    'overview.forecastLastRun': 'Forecast last run: {age}',
    'overview.runForecast': 'Run forecast',
    'overview.rerunForecast': 'Re-run forecast',
    'overview.urgentTitle': 'Urgent Actions Required',
    'overview.urgentSub': 'Immediate attention needed',
    'overview.itemsCount': '{count} Item{plural}',
    'overview.stockLabel': 'Stock:',
    'overview.stockoutRisk': '{prob}% stockout risk',
    'overview.reorderNow': 'Reorder Now ›',
    'overview.smartRecommendations': 'Smart Recommendations',
    'overview.salesRowsChecked': '{count} sales rows checked.',

    'orders.awaitingConfirmation': 'awaiting delivery confirmation',
    'orders.pendingDelivery': 'Pending delivery: {detail}',
    'orders.quantityUnits': '{quantity} units',
    'orders.dueDate': '{quantity} units due {date}',
    'orders.recordPlaced': 'Record the order you placed for <strong>{product}</strong>. This creates a pending delivery to confirm later.',
    'orders.updateDetails': 'Update the order details for <strong>{product}</strong> before delivery is confirmed.',
    'orders.confirmReceived': 'Confirm the actual quantity received for <strong>{product}</strong>.',
    'orders.supplierNote': 'Supplier reference or note',

    'confidence.low': 'Low',
    'confidence.medium': 'Medium',
    'confidence.high': 'High',
    'confidence.noForecast': 'No forecast output is available for this product yet.',
    'confidence.inactive': 'Limited recent activity. Treat this as a review item, not an automatic buying decision.',
    'confidence.highDetail': 'Forecast, model output, and decision reason are all available.',
    'confidence.mediumDetail': 'Enough evidence for review, but confirm against recent supplier or demand changes.',
    'confidence.holdDetail': 'Current stock appears sufficient based on the latest forecast.',

    'forecast.productsForecast': 'Products Forecast',
    'forecast.withRisingDemand': '{count} with rising demand',
    'forecast.dominantModel': 'Dominant Model',
    'forecast.lowestMae': '{pct}% of products (lowest MAE)',
    'forecast.highStockoutRisk': 'High Stockout Risk',
    'forecast.productsStockoutProb': 'products ≥50% stockout probability',
    'forecast.modelDistribution': 'Model Distribution',
    'forecast.runFullPipelineHelp': 'This will recalculate forecasts, decisions, evaluation metrics, scenarios, and classification for every product.',
    'forecast.yesRecalculateAll': 'Yes, Recalculate All',
    'forecast.trendIncreasing': 'Rising',
    'forecast.trendDecreasing': 'Falling',
    'forecast.trendStable': 'Stable',

    'evaluation.avgRmse': 'Avg RMSE',
    'evaluation.avgMase': 'Avg MASE',
    'evaluation.beatsNaiveHint': '<1 = beats naïve',
    'evaluation.beatNaive': 'Beat Naïve Baseline',

    'scenario.noChange': 'No change',
    'scenario.stockoutDaysChange': '{sign}{days} days',
    'scenario.prevents': 'The StockLens reorder system prevents <strong>{days} stockout-day{plural}</strong> ({pct}% reduction) over the {horizon}-day horizon at ×{demand} demand. Current reorder policy is working — maintain it.',
    'scenario.adds': 'Under these conditions the system adds <strong>{days} stockout-day{plural}</strong> compared to no system. Consider increasing safety stock or shortening your reorder cycle.',
    'scenario.neutral': 'No change in stockout days under this scenario. The system is neutral at ×{demand} demand — check if order quantities are set correctly.',
    'scenario.mostExposed': 'Most exposed products: {products}',
    'scenario.darkerHelp': 'Darker = more products in that class. AX = high-value, stable (tightest control). CZ = low-value, erratic (consider discontinuing).',

    'abc.strategy.AX': 'Daily tight control',
    'abc.strategy.AY': 'Daily + buffer',
    'abc.strategy.AZ': 'Daily high safety stock',
    'abc.strategy.BX': 'Weekly EOQ',
    'abc.strategy.BY': 'Weekly moderate buffer',
    'abc.strategy.BZ': 'Weekly demand-sensing',
    'abc.strategy.CX': 'Monthly min-max',
    'abc.strategy.CY': 'Monthly periodic',
    'abc.strategy.CZ': 'Review/discontinue',

    'team.manager': 'Manager',
    'team.staff': 'Staff',
    'team.verified': 'Verified',
    'team.unverified': 'Unverified',
    'team.companySettingsSaved': 'Company settings saved.',
    'team.companySettingsFailed': 'Could not save settings.',
    'team.deleteCompanyPrompt': 'Type DELETE to permanently delete this company data.',
    'team.deleteAccountPrompt': 'Type DELETE to deactivate your account.',
    'team.deleteCompanyFailed': 'Could not delete company.',
    'team.deleteAccountFailed': 'Could not delete account.',
    'team.verificationSent': 'Verification sent.',
    'team.verificationOpen': ' Open: {url}',
    'team.verificationReady': 'Verification link ready: {url}',
    'team.verificationFailed': 'Could not resend verification.',
    'team.inviteExpires': 'Expires: {date}',
    'team.pipelineQueued': 'Pipeline queued...',
    'team.pipelineCompleteProducts': '{message} ({count} products).',

    'chart.unitsSold': 'Units Sold',
    'chart.predicted': 'Predicted',
    'chart.actual': 'Actual',
    'chart.dailyUnits': 'Daily Units',
    'chart.stockOnHand': 'Stock on Hand',
    'chart.reorderPoint': 'Reorder Point',
    'chart.units': 'Units',
    'chart.withoutSystem': 'Without System',
    'chart.withStockLens': 'With StockLens',
    'chart.stockoutDays90': 'Stockout Days (90-day sim)',
    'chart.uncategorized': 'Uncategorized',
    'chart.units30d': 'Units (30d)',
    'chart.managerOnlyFva': 'Forecast vs Actual is only available to managers. Ask your manager to review model accuracy.',

    'reason.inactive': 'Product is marked inactive. No reorder action required.',
    'reason.noForecast': 'No forecast data available. Upload at least 30 days of sales data to enable automatic decisions.',
    'reason.insufficient': 'Insufficient sales history for this product. At least 30 days of data are needed for forecasting. Upload more sales data to enable automatic reorder decisions.',
    'reason.stockBelowSafety': 'Stock ({stock} units) is below safety stock ({safetyStock} units). Urgent reorder of {orderQty} units recommended (EOQ).',
    'reason.stockBelowReorder': 'Stock ({stock} units) is below reorder point ({reorderPoint} units). Consider ordering {orderQty} units soon (EOQ).',
    'reason.overstock': 'Stock ({stock} units) is more than three times the reorder point ({reorderPoint} units). Pause purchasing and consider markdowns, bundles, or supplier order reductions.',
    'reason.hold': 'Stock ({stock} units) is above reorder point ({reorderPoint} units). No immediate action required.',
    'reason.stockoutProb': 'Stockout probability over lead time: {prob}%.',
    'reason.trendingUp': 'Demand is trending UP (+{slope} units/day) — consider ordering more.',
    'reason.trendingDown': 'Demand is trending DOWN (-{slope} units/day) — monitor for excess stock.',

    'server.stockAlert': 'Stock alert triggered for {product}',
    'server.salesUploaded': 'Sales data uploaded: {rows} rows added',
    'server.reorderActivity': 'Reorder {verb}: {qty} units of {product} by {user}',
    'server.forecastsRecalculated': 'Forecast models recalculated for all products',
    'server.reorderLogged': 'Reorder of {qty} units logged for {product}.',
    'server.pendingUpdated': 'Pending reorder updated for {product}.',
    'server.deliveryConfirmedQty': 'Delivery confirmed — {qty} units added to stock.',
    'server.productCreated': 'Product "{name}" created successfully',
    'server.productDuplicate': 'A product named "{name}" already exists',
    'server.salesEntry': 'Sales entry {action}',
    'server.pipelineCompleteForProduct': 'Pipeline complete for "{product}"',
    'server.insufficientManual': 'Insufficient data — need at least 30 days of sales. You have {have} so far. Add {need} more day(s) to unlock forecasting.',
    'server.noProductsUploaded': 'No products have been uploaded yet.',
    'server.noSalesRows': 'No sales rows are available for forecasting.',
    'server.weakForecasts': 'Forecasts may be weak because fewer than 30 sales rows are available.',
    'server.lowHistoryProducts': '{count} active product(s) have fewer than 30 sales rows.',
    'server.missingInventoryProducts': '{count} active product(s) are missing usable stock levels.',
    'server.dataReady': 'Data coverage looks ready for daily decisions.',
    'server.uploadBeforeTrust': 'Upload sales and inventory data before trusting recommendations.',
    'server.usableWithGaps': 'Recommendations are usable, but a few data gaps need attention.',
    'server.recommendation': '{product} is projected to stock out {timing} (current stock: {stock} units, stockout probability: {prob}%). Recommended order quantity: {qty} units (EOQ-based).{trend}',
    'server.timingDays': 'in approximately {days} day{plural}',
    'server.timingImminent': 'imminently',
    'server.trendingUpEoq': 'Demand is trending upward — consider ordering more than the EOQ.',

    'decision.filters': 'Decision filters',
    'field.expectedArrival': 'Expected Arrival',
    'field.by': 'By',
    'auth.backSignIn': 'Back to sign in',
    'auth.recoverTitle': 'Recover your account',
    'auth.recoverBody': 'Enter your email and StockLens will show the recovery path for this deployment.',
    'auth.emailRequired': 'Email is required.',
    'auth.openResetLink': 'Open reset link',
    'auth.contactAdminReset': 'Contact your StockLens administrator to reset access.',
    'auth.resetTitle': 'Reset password',
    'auth.newPassword': 'New password',
    'auth.updatePassword': 'Update password',
    'auth.resetValidation': 'Use an 8+ character password and make sure both fields match.',
    'auth.passwordUpdated': 'Password updated.',
    'auth.verifyTitle': 'Verify email',
    'auth.checkingVerification': 'Checking your verification link...',
    'auth.emailVerified': 'Email verified.',
    'auth.verificationFailed': 'Verification failed.',
    'msg.inviteRequiredStaff': 'Invite code is required for staff accounts.',
    'msg.failedCreateProduct': 'Failed to create product',
  },
};

Object.entries(SUPPLEMENTAL_TRANSLATIONS).forEach(([lang, patch]) => {
  window.TRANSLATIONS[lang] = Object.assign(window.TRANSLATIONS[lang] || {}, patch);
});

const DECISION_REASON_TRANSLATIONS = {
  es: {
    'reason.inactive': 'El producto está marcado como inactivo. No se requiere reposición.',
    'reason.noForecast': 'No hay datos de previsión disponibles. Sube al menos 30 días de ventas para activar decisiones automáticas.',
    'reason.insufficient': 'Historial de ventas insuficiente para este producto. Se necesitan al menos 30 días de datos para pronosticar. Sube más ventas para activar decisiones automáticas.',
    'reason.stockBelowSafety': 'El stock ({stock} unidades) está por debajo del stock de seguridad ({safetyStock} unidades). Se recomienda una reposición urgente de {orderQty} unidades (EOQ).',
    'reason.stockBelowReorder': 'El stock ({stock} unidades) está por debajo del punto de reposición ({reorderPoint} unidades). Considera pedir {orderQty} unidades pronto (EOQ).',
    'reason.overstock': 'El stock ({stock} unidades) supera tres veces el punto de reposición ({reorderPoint} unidades). Pausa compras y considera descuentos, packs o reducir pedidos al proveedor.',
    'reason.hold': 'El stock ({stock} unidades) está por encima del punto de reposición ({reorderPoint} unidades). No se requiere acción inmediata.',
    'reason.stockoutProb': 'Probabilidad de rotura durante el plazo de entrega: {prob}%.',
    'reason.trendingUp': 'La demanda sube (+{slope} unidades/día); considera pedir más.',
    'reason.trendingDown': 'La demanda baja (-{slope} unidades/día); vigila el exceso de stock.',
    'server.recommendation': '{product} podría quedarse sin stock {timing} (stock actual: {stock} unidades, probabilidad de rotura: {prob}%). Cantidad recomendada: {qty} unidades (EOQ).{trend}',
    'server.timingDays': 'en aproximadamente {days} día{plural}',
    'server.timingImminent': 'de forma inminente',
    'server.trendingUpEoq': 'La demanda está subiendo; considera pedir más que el EOQ.',
  },
  fr: {
    'reason.inactive': 'Le produit est marqué comme inactif. Aucune commande n’est nécessaire.',
    'reason.noForecast': 'Aucune donnée de prévision disponible. Importez au moins 30 jours de ventes pour activer les décisions automatiques.',
    'reason.insufficient': 'Historique de ventes insuffisant pour ce produit. Il faut au moins 30 jours de données pour prévoir. Importez plus de ventes pour activer les décisions automatiques.',
    'reason.stockBelowSafety': 'Le stock ({stock} unités) est inférieur au stock de sécurité ({safetyStock} unités). Une commande urgente de {orderQty} unités est recommandée (EOQ).',
    'reason.stockBelowReorder': 'Le stock ({stock} unités) est inférieur au point de commande ({reorderPoint} unités). Envisagez de commander {orderQty} unités bientôt (EOQ).',
    'reason.overstock': 'Le stock ({stock} unités) dépasse trois fois le point de commande ({reorderPoint} unités). Suspendez les achats et envisagez des remises, lots ou réductions de commande fournisseur.',
    'reason.hold': 'Le stock ({stock} unités) est supérieur au point de commande ({reorderPoint} unités). Aucune action immédiate n’est requise.',
    'reason.stockoutProb': 'Probabilité de rupture pendant le délai d’approvisionnement : {prob} %.',
    'reason.trendingUp': 'La demande augmente (+{slope} unités/jour) ; envisagez de commander davantage.',
    'reason.trendingDown': 'La demande baisse (-{slope} unités/jour) ; surveillez le surstock.',
    'server.recommendation': '{product} risque une rupture {timing} (stock actuel : {stock} unités, probabilité de rupture : {prob} %). Quantité recommandée : {qty} unités (EOQ).{trend}',
    'server.timingDays': 'dans environ {days} jour{plural}',
    'server.timingImminent': 'de façon imminente',
    'server.trendingUpEoq': 'La demande augmente ; envisagez de commander plus que l’EOQ.',
  },
  de: {
    'reason.inactive': 'Das Produkt ist als inaktiv markiert. Keine Nachbestellung erforderlich.',
    'reason.noForecast': 'Keine Prognosedaten verfügbar. Laden Sie mindestens 30 Tage Verkaufsdaten hoch, um automatische Entscheidungen zu aktivieren.',
    'reason.insufficient': 'Für dieses Produkt gibt es zu wenig Verkaufshistorie. Für Prognosen werden mindestens 30 Tage Daten benötigt.',
    'reason.stockBelowSafety': 'Der Bestand ({stock} Einheiten) liegt unter dem Sicherheitsbestand ({safetyStock} Einheiten). Eine dringende Nachbestellung von {orderQty} Einheiten wird empfohlen (EOQ).',
    'reason.stockBelowReorder': 'Der Bestand ({stock} Einheiten) liegt unter dem Bestellpunkt ({reorderPoint} Einheiten). Bestellen Sie bald {orderQty} Einheiten (EOQ).',
    'reason.overstock': 'Der Bestand ({stock} Einheiten) liegt mehr als dreimal über dem Bestellpunkt ({reorderPoint} Einheiten). Pausieren Sie Einkäufe und prüfen Sie Rabatte, Bundles oder kleinere Lieferantenbestellungen.',
    'reason.hold': 'Der Bestand ({stock} Einheiten) liegt über dem Bestellpunkt ({reorderPoint} Einheiten). Keine sofortige Maßnahme erforderlich.',
    'reason.stockoutProb': 'Fehlbestandswahrscheinlichkeit während der Lieferzeit: {prob} %.',
    'reason.trendingUp': 'Die Nachfrage steigt (+{slope} Einheiten/Tag); bestellen Sie ggf. mehr.',
    'reason.trendingDown': 'Die Nachfrage sinkt (-{slope} Einheiten/Tag); achten Sie auf Überbestand.',
  },
  pt: {
    'reason.stockBelowSafety': 'O estoque ({stock} unidades) está abaixo do estoque de segurança ({safetyStock} unidades). Recomenda-se reposição urgente de {orderQty} unidades (EOQ).',
    'reason.stockBelowReorder': 'O estoque ({stock} unidades) está abaixo do ponto de reposição ({reorderPoint} unidades). Considere pedir {orderQty} unidades em breve (EOQ).',
    'reason.overstock': 'O estoque ({stock} unidades) é mais de três vezes o ponto de reposição ({reorderPoint} unidades). Pause compras e considere promoções, kits ou redução de pedidos.',
    'reason.hold': 'O estoque ({stock} unidades) está acima do ponto de reposição ({reorderPoint} unidades). Nenhuma ação imediata é necessária.',
    'reason.stockoutProb': 'Probabilidade de ruptura durante o prazo de entrega: {prob}%.',
    'reason.trendingUp': 'A demanda está subindo (+{slope} unidades/dia); considere pedir mais.',
    'reason.trendingDown': 'A demanda está caindo (-{slope} unidades/dia); monitore excesso de estoque.',
  },
  ar: {
    'reason.stockBelowSafety': 'المخزون ({stock} وحدة) أقل من مخزون الأمان ({safetyStock} وحدة). يوصى بطلب عاجل قدره {orderQty} وحدة (EOQ).',
    'reason.stockBelowReorder': 'المخزون ({stock} وحدة) أقل من نقطة إعادة الطلب ({reorderPoint} وحدة). فكّر في طلب {orderQty} وحدة قريباً (EOQ).',
    'reason.overstock': 'المخزون ({stock} وحدة) يزيد عن ثلاثة أضعاف نقطة إعادة الطلب ({reorderPoint} وحدة). أوقف الشراء مؤقتاً وفكّر في الخصومات أو الحزم أو تقليل طلبات المورد.',
    'reason.hold': 'المخزون ({stock} وحدة) أعلى من نقطة إعادة الطلب ({reorderPoint} وحدة). لا يلزم إجراء فوري.',
    'reason.stockoutProb': 'احتمال نفاد المخزون خلال مدة التوريد: {prob}%.',
    'reason.trendingUp': 'الطلب في ارتفاع (+{slope} وحدة/يوم)؛ فكّر في طلب كمية أكبر.',
    'reason.trendingDown': 'الطلب في انخفاض (-{slope} وحدة/يوم)؛ راقب فائض المخزون.',
  },
  zh: {
    'reason.stockBelowSafety': '库存（{stock} 件）低于安全库存（{safetyStock} 件）。建议紧急补货 {orderQty} 件（EOQ）。',
    'reason.stockBelowReorder': '库存（{stock} 件）低于再订购点（{reorderPoint} 件）。建议尽快订购 {orderQty} 件（EOQ）。',
    'reason.overstock': '库存（{stock} 件）超过再订购点（{reorderPoint} 件）的三倍。建议暂停采购，并考虑折扣、组合销售或减少供应商订单。',
    'reason.hold': '库存（{stock} 件）高于再订购点（{reorderPoint} 件）。无需立即操作。',
    'reason.stockoutProb': '交货期内缺货概率：{prob}%。',
    'reason.trendingUp': '需求正在上升（+{slope} 件/天）；可考虑增加订购量。',
    'reason.trendingDown': '需求正在下降（-{slope} 件/天）；请关注库存过剩。',
  },
  hi: {
    'reason.stockBelowSafety': 'स्टॉक ({stock} यूनिट) सुरक्षा स्टॉक ({safetyStock} यूनिट) से कम है। {orderQty} यूनिट का तुरंत रीऑर्डर सुझाया गया है (EOQ)।',
    'reason.stockBelowReorder': 'स्टॉक ({stock} यूनिट) रीऑर्डर पॉइंट ({reorderPoint} यूनिट) से कम है। जल्द {orderQty} यूनिट ऑर्डर करने पर विचार करें (EOQ)।',
    'reason.overstock': 'स्टॉक ({stock} यूनिट) रीऑर्डर पॉइंट ({reorderPoint} यूनिट) से तीन गुना अधिक है। खरीद रोकें और छूट, बंडल या सप्लायर ऑर्डर कम करने पर विचार करें।',
    'reason.hold': 'स्टॉक ({stock} यूनिट) रीऑर्डर पॉइंट ({reorderPoint} यूनिट) से ऊपर है। अभी कोई कार्रवाई आवश्यक नहीं है।',
    'reason.stockoutProb': 'लीड टाइम के दौरान स्टॉक खत्म होने की संभावना: {prob}%。',
    'reason.trendingUp': 'मांग बढ़ रही है (+{slope} यूनिट/दिन); अधिक ऑर्डर करने पर विचार करें।',
    'reason.trendingDown': 'मांग घट रही है (-{slope} यूनिट/दिन); अतिरिक्त स्टॉक पर नज़र रखें।',
  },
  bn: {
    'reason.stockBelowSafety': 'স্টক ({stock} ইউনিট) নিরাপত্তা স্টকের ({safetyStock} ইউনিট) নিচে। জরুরি ভিত্তিতে {orderQty} ইউনিট পুনরায় অর্ডার করার পরামর্শ দেওয়া হচ্ছে (EOQ)।',
    'reason.stockBelowReorder': 'স্টক ({stock} ইউনিট) পুনরায় অর্ডার পয়েন্টের ({reorderPoint} ইউনিট) নিচে। শিগগির {orderQty} ইউনিট অর্ডার করার কথা ভাবুন (EOQ)।',
    'reason.overstock': 'স্টক ({stock} ইউনিট) পুনরায় অর্ডার পয়েন্টের ({reorderPoint} ইউনিট) তিন গুণের বেশি। কেনাকাটা বিরতি দিন এবং ছাড়, বান্ডল বা সরবরাহকারী অর্ডার কমানোর কথা ভাবুন।',
    'reason.hold': 'স্টক ({stock} ইউনিট) পুনরায় অর্ডার পয়েন্টের ({reorderPoint} ইউনিট) উপরে। এখনই কোনো পদক্ষেপ দরকার নেই।',
    'reason.stockoutProb': 'লিড টাইমে স্টকআউটের সম্ভাবনা: {prob}%。',
    'reason.trendingUp': 'চাহিদা বাড়ছে (+{slope} ইউনিট/দিন); বেশি অর্ডার করার কথা ভাবুন।',
    'reason.trendingDown': 'চাহিদা কমছে (-{slope} ইউনিট/দিন); অতিরিক্ত স্টক পর্যবেক্ষণ করুন।',
  },
  ur: {
    'reason.stockBelowSafety': 'اسٹاک ({stock} یونٹ) حفاظتی اسٹاک ({safetyStock} یونٹ) سے کم ہے۔ {orderQty} یونٹس کا فوری ری آرڈر تجویز ہے (EOQ)۔',
    'reason.stockBelowReorder': 'اسٹاک ({stock} یونٹ) ری آرڈر پوائنٹ ({reorderPoint} یونٹ) سے کم ہے۔ جلد {orderQty} یونٹس آرڈر کرنے پر غور کریں (EOQ)۔',
    'reason.overstock': 'اسٹاک ({stock} یونٹ) ری آرڈر پوائنٹ ({reorderPoint} یونٹ) سے تین گنا زیادہ ہے۔ خریداری روکیں اور ڈسکاؤنٹ، بنڈلز یا سپلائر آرڈر کم کرنے پر غور کریں۔',
    'reason.hold': 'اسٹاک ({stock} یونٹ) ری آرڈر پوائنٹ ({reorderPoint} یونٹ) سے اوپر ہے۔ فوری کارروائی ضروری نہیں۔',
    'reason.stockoutProb': 'لیڈ ٹائم کے دوران اسٹاک ختم ہونے کا امکان: {prob}٪۔',
    'reason.trendingUp': 'طلب بڑھ رہی ہے (+{slope} یونٹ/دن)؛ زیادہ آرڈر کرنے پر غور کریں۔',
    'reason.trendingDown': 'طلب کم ہو رہی ہے (-{slope} یونٹ/دن)؛ اضافی اسٹاک پر نظر رکھیں۔',
  },
  tr: {
    'reason.stockBelowSafety': 'Stok ({stock} adet), güvenlik stoğunun ({safetyStock} adet) altında. {orderQty} adet acil sipariş önerilir (EOQ).',
    'reason.stockBelowReorder': 'Stok ({stock} adet), yeniden sipariş noktasının ({reorderPoint} adet) altında. Yakında {orderQty} adet sipariş etmeyi düşünün (EOQ).',
    'reason.overstock': 'Stok ({stock} adet), yeniden sipariş noktasının ({reorderPoint} adet) üç katından fazla. Satın almayı durdurun; indirim, paket veya tedarikçi sipariş azaltımı düşünün.',
    'reason.hold': 'Stok ({stock} adet), yeniden sipariş noktasının ({reorderPoint} adet) üstünde. Acil işlem gerekmez.',
    'reason.stockoutProb': 'Teslim süresi içinde stok tükenme olasılığı: {prob}%.',
    'reason.trendingUp': 'Talep artıyor (+{slope} adet/gün); daha fazla sipariş etmeyi düşünün.',
    'reason.trendingDown': 'Talep düşüyor (-{slope} adet/gün); fazla stoğu izleyin.',
  },
  id: {
    'reason.stockBelowSafety': 'Stok ({stock} unit) berada di bawah stok pengaman ({safetyStock} unit). Disarankan pemesanan ulang mendesak sebanyak {orderQty} unit (EOQ).',
    'reason.stockBelowReorder': 'Stok ({stock} unit) berada di bawah titik pemesanan ulang ({reorderPoint} unit). Pertimbangkan memesan {orderQty} unit segera (EOQ).',
    'reason.overstock': 'Stok ({stock} unit) lebih dari tiga kali titik pemesanan ulang ({reorderPoint} unit). Hentikan pembelian sementara dan pertimbangkan diskon, bundel, atau pengurangan pesanan pemasok.',
    'reason.hold': 'Stok ({stock} unit) berada di atas titik pemesanan ulang ({reorderPoint} unit). Tidak perlu tindakan segera.',
    'reason.stockoutProb': 'Probabilitas kehabisan stok selama lead time: {prob}%.',
    'reason.trendingUp': 'Permintaan meningkat (+{slope} unit/hari); pertimbangkan memesan lebih banyak.',
    'reason.trendingDown': 'Permintaan menurun (-{slope} unit/hari); pantau kelebihan stok.',
  },
  th: {
    'reason.stockBelowSafety': 'สต็อก ({stock} หน่วย) ต่ำกว่าสต็อกปลอดภัย ({safetyStock} หน่วย) แนะนำให้สั่งซื้อด่วน {orderQty} หน่วย (EOQ)',
    'reason.stockBelowReorder': 'สต็อก ({stock} หน่วย) ต่ำกว่าจุดสั่งซื้อใหม่ ({reorderPoint} หน่วย) ควรพิจารณาสั่ง {orderQty} หน่วยเร็ว ๆ นี้ (EOQ)',
    'reason.overstock': 'สต็อก ({stock} หน่วย) มากกว่าสามเท่าของจุดสั่งซื้อใหม่ ({reorderPoint} หน่วย) ควรหยุดซื้อชั่วคราวและพิจารณาส่วนลด ชุดสินค้า หรือการลดคำสั่งซื้อจากซัพพลายเออร์',
    'reason.hold': 'สต็อก ({stock} หน่วย) สูงกว่าจุดสั่งซื้อใหม่ ({reorderPoint} หน่วย) ยังไม่ต้องดำเนินการทันที',
    'reason.stockoutProb': 'ความน่าจะเป็นที่สินค้าจะหมดในช่วงเวลานำ: {prob}%',
    'reason.trendingUp': 'ความต้องการเพิ่มขึ้น (+{slope} หน่วย/วัน) ควรพิจารณาสั่งเพิ่ม',
    'reason.trendingDown': 'ความต้องการลดลง (-{slope} หน่วย/วัน) ควรเฝ้าดูสต็อกเกิน',
  },
  vi: {
    'reason.stockBelowSafety': 'Tồn kho ({stock} đơn vị) thấp hơn tồn kho an toàn ({safetyStock} đơn vị). Nên đặt gấp {orderQty} đơn vị (EOQ).',
    'reason.stockBelowReorder': 'Tồn kho ({stock} đơn vị) thấp hơn điểm đặt hàng lại ({reorderPoint} đơn vị). Nên cân nhắc đặt {orderQty} đơn vị sớm (EOQ).',
    'reason.overstock': 'Tồn kho ({stock} đơn vị) cao hơn ba lần điểm đặt hàng lại ({reorderPoint} đơn vị). Tạm dừng mua hàng và cân nhắc giảm giá, bán theo bộ hoặc giảm đơn đặt nhà cung cấp.',
    'reason.hold': 'Tồn kho ({stock} đơn vị) cao hơn điểm đặt hàng lại ({reorderPoint} đơn vị). Chưa cần hành động ngay.',
    'reason.stockoutProb': 'Xác suất hết hàng trong thời gian giao hàng: {prob}%.',
    'reason.trendingUp': 'Nhu cầu đang tăng (+{slope} đơn vị/ngày); cân nhắc đặt nhiều hơn.',
    'reason.trendingDown': 'Nhu cầu đang giảm (-{slope} đơn vị/ngày); theo dõi tồn kho dư.',
  },
};

Object.entries(DECISION_REASON_TRANSLATIONS).forEach(([lang, patch]) => {
  window.TRANSLATIONS[lang] = Object.assign(window.TRANSLATIONS[lang] || {}, patch);
});

Object.entries(window.TRANSLATIONS).forEach(([, dict]) => {
  dict['nav.upload'] ||= dict['upload.title'];
  dict['nav.daily'] ||= window.TRANSLATIONS.en['nav.daily'];
  dict['nav.abcxyz'] ||= 'ABC-XYZ';
  dict['nav.team'] ||= dict['page.team'] || window.TRANSLATIONS.en['page.team'];
  dict['page.upload'] ||= dict['upload.title'];
  dict['page.classification'] ||= dict['card.abcxyzTitle'] || 'ABC-XYZ';
  dict['page.team'] ||= dict['nav.team'];
  dict['btn.viewAll'] ||= window.TRANSLATIONS.en['btn.viewAll'];
  dict['btn.viewInventory'] ||= window.TRANSLATIONS.en['btn.viewInventory'];
  dict['btn.exportCsv'] ||= window.TRANSLATIONS.en['btn.exportCsv'];
  dict['btn.runFullPipeline'] ||= window.TRANSLATIONS.en['btn.runFullPipeline'];
  dict['btn.runSimulation'] ||= window.TRANSLATIONS.en['btn.runSimulation'];
  dict['search.inventory'] ||= window.TRANSLATIONS.en['search.inventory'];
  dict['search.decisions'] ||= window.TRANSLATIONS.en['search.decisions'];
  dict['filter.all'] ||= window.TRANSLATIONS.en['filter.all'];
  dict['filter.reorder'] ||= dict['action.reorder'];
  dict['filter.atRisk'] ||= dict['action.at_risk'];
  dict['filter.hold'] ||= dict['action.hold'];
  dict['home.ctaUploadShort'] ||= dict['home.ctaUpload'] || window.TRANSLATIONS.en['home.ctaUploadShort'];
  dict['common.language'] ||= window.TRANSLATIONS.en['common.language'];
  dict['common.copy'] ||= window.TRANSLATIONS.en['common.copy'];
  dict['auth.signInArrow'] ||= `${dict['auth.signIn'] || window.TRANSLATIONS.en['auth.signIn']} ->`;
  dict['auth.emailPlaceholder'] ||= window.TRANSLATIONS.en['auth.emailPlaceholder'];
  dict['auth.passwordPlaceholder'] ||= window.TRANSLATIONS.en['auth.passwordPlaceholder'];
  dict['auth.confirmPassword'] ||= window.TRANSLATIONS.en['auth.confirmPassword'];
  dict['auth.confirmPasswordPlaceholder'] ||= window.TRANSLATIONS.en['auth.confirmPasswordPlaceholder'];
  dict['auth.name'] ||= window.TRANSLATIONS.en['auth.name'];
  dict['auth.namePlaceholder'] ||= window.TRANSLATIONS.en['auth.namePlaceholder'];
  dict['auth.showPassword'] ||= window.TRANSLATIONS.en['auth.showPassword'];
  dict['auth.noAccount'] ||= window.TRANSLATIONS.en['auth.noAccount'];
  dict['auth.createFree'] ||= window.TRANSLATIONS.en['auth.createFree'];
  dict['auth.haveAccount'] ||= window.TRANSLATIONS.en['auth.haveAccount'];
  dict['auth.manager'] ||= window.TRANSLATIONS.en['auth.manager'];
  dict['auth.staff'] ||= window.TRANSLATIONS.en['auth.staff'];
  dict['auth.inviteNote'] ||= window.TRANSLATIONS.en['auth.inviteNote'];
  dict['auth.inviteNoteBody'] ||= window.TRANSLATIONS.en['auth.inviteNoteBody'];
  dict['auth.inviteCode'] ||= window.TRANSLATIONS.en['auth.inviteCode'];
  dict['auth.invitePlaceholder'] ||= window.TRANSLATIONS.en['auth.invitePlaceholder'];
  dict['auth.optional'] ||= window.TRANSLATIONS.en['auth.optional'];
  dict['auth.registerSubmit'] ||= window.TRANSLATIONS.en['auth.registerSubmit'];
  dict['auth.creatingAccount'] ||= window.TRANSLATIONS.en['auth.creatingAccount'];
  [
    'onboarding.navStep', 'onboarding.welcomeTitle', 'onboarding.welcomeSub',
    'onboarding.feature1Title', 'onboarding.feature1Body', 'onboarding.feature2Title',
    'onboarding.feature2Body', 'onboarding.feature3Title', 'onboarding.feature3Body',
    'onboarding.getStarted', 'onboarding.workspaceTitle', 'onboarding.workspaceSub',
    'onboarding.companyName', 'onboarding.companyPlaceholder', 'onboarding.roleLabel',
    'onboarding.managerOwner', 'onboarding.managerBody', 'onboarding.staffMember',
    'onboarding.staffBody', 'onboarding.industry', 'onboarding.description',
    'onboarding.descriptionPlaceholder', 'onboarding.createWorkspace', 'onboarding.joinExisting',
    'onboarding.doneTitle', 'onboarding.doneSub', 'onboarding.yourInviteCode',
    'onboarding.goDashboard', 'onboarding.settingUp', 'industry.grocery', 'industry.pharmacy',
    'industry.clothing', 'industry.electronics', 'industry.generalRetail', 'industry.other',
    'msg.requiredFields', 'msg.passwordMismatch', 'msg.passwordLength', 'msg.registrationFailed',
    'msg.companyRequired', 'msg.companyCreateFailed', 'msg.copiedClipboard',
  ].forEach(key => {
    dict[key] ||= window.TRANSLATIONS.en[key];
  });
});

function formatTranslation(value) {
  return String(value).replace(/->/g, '→').replace(/<-/g, '←');
}

const AUTO_TEXT_KEYS = Object.fromEntries(
  Object.entries(window.TRANSLATIONS.en)
    .filter(([, value]) => typeof value === 'string' && value && !value.includes('<'))
    .map(([key, value]) => [value.replace(/->/g, '→'), key])
);
const AUTO_TEXT_NODE_KEYS = new WeakMap();

function translateExactTextNodes(root = document.body) {
  if (!root) return;
  const skip = new Set(['SCRIPT', 'STYLE', 'OPTION', 'TEXTAREA', 'INPUT']);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || skip.has(parent.tagName) || parent.closest('[data-no-i18n]')) {
        return NodeFilter.FILTER_REJECT;
      }
      const text = node.nodeValue.trim();
      return AUTO_TEXT_NODE_KEYS.has(node) || (text && AUTO_TEXT_KEYS[text])
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const raw = node.nodeValue;
    const key = AUTO_TEXT_NODE_KEYS.get(node) || AUTO_TEXT_KEYS[raw.trim()];
    if (!key) return;
    AUTO_TEXT_NODE_KEYS.set(node, key);
    const next = raw.replace(raw.trim(), formatTranslation(t(key)));
    if (node.nodeValue !== next) node.nodeValue = next;
  });
}

// Active language (default from localStorage or 'en')
window.currentLang = localStorage.getItem('lang') || 'en';
const MISSING_TRANSLATION_WARNINGS = new Set();

/** Translate a key for the active language. */
function t(key) {
  const dict = window.TRANSLATIONS[window.currentLang] || window.TRANSLATIONS['en'];
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  if (Object.prototype.hasOwnProperty.call(window.TRANSLATIONS['en'], key)) {
    const warnKey = `${window.currentLang}:${key}`;
    if (window.currentLang !== 'en' && !MISSING_TRANSLATION_WARNINGS.has(warnKey)) {
      MISSING_TRANSLATION_WARNINGS.add(warnKey);
      console.warn(`Missing translation: ${key}`);
    }
    return window.TRANSLATIONS['en'][key];
  }
  if (!MISSING_TRANSLATION_WARNINGS.has(key)) {
    MISSING_TRANSLATION_WARNINGS.add(key);
    console.warn(`Missing translation: ${key}`);
  }
  return key;
}

function tf(key, values = {}) {
  return formatTranslation(t(key)).replace(/\{(\w+)\}/g, (_, name) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : `{${name}}`
  ));
}

function plural(count) {
  return Number(count) === 1 ? '' : 's';
}

function translateDecisionReason(reason) {
  const text = String(reason || '').trim();
  if (!text) return t('msg.noReason');
  const exactKey = AUTO_TEXT_KEYS[text];
  if (exactKey) return tf(exactKey);

  const stockout = text.match(/Stockout probability over lead time: ([\d.]+)%\./);
  const trendUp = text.match(/Demand is trending UP \(\+([\d.]+) units\/day\) — consider ordering more\./);
  const trendDown = text.match(/Demand is trending DOWN \([−-]([\d.]+) units\/day\) — monitor for excess stock\./);
  const suffix = [
    stockout ? tf('reason.stockoutProb', { prob: stockout[1] }) : '',
    trendUp ? tf('reason.trendingUp', { slope: trendUp[1] }) : '',
    trendDown ? tf('reason.trendingDown', { slope: trendDown[1] }) : '',
  ].filter(Boolean).join(' ');
  const base = text
    .replace(/ Stockout probability over lead time: [\d.]+%\./, '')
    .replace(/ Demand is trending UP \(\+[\d.]+ units\/day\) — consider ordering more\./, '')
    .replace(/ Demand is trending DOWN \([−-][\d.]+ units\/day\) — monitor for excess stock\./, '')
    .trim();

  const patterns = [
    [/^Stock \(([\d.]+) units\) is below safety stock \(([\d.]+) units\)\. Urgent reorder of ([\d.]+) units recommended \(EOQ\)\.$/, 'reason.stockBelowSafety', ['stock', 'safetyStock', 'orderQty']],
    [/^Stock \(([\d.]+) units\) is below reorder point \(([\d.]+) units\)\. Consider ordering ([\d.]+) units soon \(EOQ\)\.$/, 'reason.stockBelowReorder', ['stock', 'reorderPoint', 'orderQty']],
    [/^Stock \(([\d.]+) units\) is more than three times the reorder point \(([\d.]+) units\)\. Pause purchasing and consider markdowns, bundles, or supplier order reductions\.$/, 'reason.overstock', ['stock', 'reorderPoint']],
    [/^Stock \(([\d.]+) units\) is above reorder point \(([\d.]+) units\)\. No immediate action required\.$/, 'reason.hold', ['stock', 'reorderPoint']],
  ];
  for (const [regex, key, names] of patterns) {
    const match = base.match(regex);
    if (match) {
      const values = Object.fromEntries(names.map((name, i) => [name, match[i + 1]]));
      return [tf(key, values), suffix].filter(Boolean).join(' ');
    }
  }
  return text;
}

function translateServerMessage(message) {
  const text = String(message || '').trim();
  if (!text) return '';
  const exactKey = AUTO_TEXT_KEYS[text];
  if (exactKey) return tf(exactKey);
  const reason = translateDecisionReason(text);
  if (reason !== text) return reason;
  const patterns = [
    [/^(.+) is projected to stock out (in approximately (\d+) days?|imminently) \(current stock: ([\d.]+) units, stockout probability: ([\d.]+)%\)\. Recommended order quantity: ([\d.]+) units \(EOQ-based\)\.(.*)$/, 'server.recommendation', ['product', 'timingRaw', 'days', 'stock', 'prob', 'qty', 'trendRaw']],
    [/^Stock alert triggered for (.+)$/, 'server.stockAlert', ['product']],
    [/^Demand is trending upward — consider ordering more than the EOQ\.$/, 'server.trendingUpEoq', []],
    [/^Sales data uploaded: (\d+) rows added$/, 'server.salesUploaded', ['rows']],
    [/^Reorder (placed|confirmed): (\d+) units of (.+) by (.+)$/, 'server.reorderActivity', ['verb', 'qty', 'product', 'user']],
    [/^Reorder of (\d+) units logged for (.+)\.$/, 'server.reorderLogged', ['qty', 'product']],
    [/^Pending reorder updated for (.+)\.$/, 'server.pendingUpdated', ['product']],
    [/^Delivery confirmed — (\d+) units added to stock\.$/, 'server.deliveryConfirmedQty', ['qty']],
    [/^Product "(.+)" created successfully$/, 'server.productCreated', ['name']],
    [/^A product named "(.+)" already exists$/, 'server.productDuplicate', ['name']],
    [/^Sales entry (created|updated)$/, 'server.salesEntry', ['action']],
    [/^Pipeline complete for "(.+)"$/, 'server.pipelineCompleteForProduct', ['product']],
    [/^Insufficient data — need at least 30 days of sales\. You have (\d+) so far\. Add (\d+) more day\(s\) to unlock forecasting\.$/, 'server.insufficientManual', ['have', 'need']],
    [/^(\d+) active product\(s\) have fewer than 30 sales rows\.$/, 'server.lowHistoryProducts', ['count']],
    [/^(\d+) active product\(s\) are missing usable stock levels\.$/, 'server.missingInventoryProducts', ['count']],
  ];
  for (const [regex, key, names] of patterns) {
    const match = text.match(regex);
    if (match) {
      const values = Object.fromEntries(names.map((name, i) => [name, match[i + 1]]));
      if (key === 'server.recommendation') {
        values.timing = values.timingRaw === 'imminently'
          ? t('server.timingImminent')
          : tf('server.timingDays', { days: values.days, plural: plural(values.days) });
        values.trend = values.trendRaw ? ` ${translateServerMessage(values.trendRaw.trim())}` : '';
      }
      return tf(key, values);
    }
  }
  return text;
}

/** Re-render all translatable elements. */
function applyTranslations() {
  const lang = window.currentLang;
  const isRTL = lang === 'ar' || lang === 'ur';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir',  isRTL ? 'rtl' : 'ltr');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const next = formatTranslation(t(key));
    if (el.textContent !== next) el.textContent = next;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const next = formatTranslation(t(el.getAttribute('data-i18n-html')));
    if (el.innerHTML !== next) el.innerHTML = next;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const next = formatTranslation(t(el.getAttribute('data-i18n-placeholder')));
    if (el.placeholder !== next) el.placeholder = next;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const next = formatTranslation(t(el.getAttribute('data-i18n-title')));
    if (el.title !== next) el.title = next;
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const next = formatTranslation(t(el.getAttribute('data-i18n-aria')));
    if (el.getAttribute('aria-label') !== next) el.setAttribute('aria-label', next);
  });

  translateExactTextNodes();
}

/** Switch language and persist. */
function setLanguage(lang) {
  window.currentLang = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
  window.dispatchEvent(new CustomEvent('stocklens:languagechange', { detail: { lang } }));
}

document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('lang-select');
  if (select) {
    select.value = window.currentLang;
    if (!select.dataset.i18nBound) {
      select.dataset.i18nBound = '1';
      select.addEventListener('change', () => setLanguage(select.value));
    }
  }
  applyTranslations();
  if (window.MutationObserver && !document.body.dataset.i18nObserverBound) {
    document.body.dataset.i18nObserverBound = '1';
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        applyTranslations();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
});
