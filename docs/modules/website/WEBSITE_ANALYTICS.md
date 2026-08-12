# Website Builder Analytics

The Website module pipes two forms of analytics telemetry to the Platform Kernel.

## 1. CMS Operational Analytics
Internal telemetry evaluating tenant utilization of the Website Builder.
* **Asset Quota Tracking:** Bytes uploaded mapped by `tenantId`.
* **Publish Velocity:** Time spent in draft state vs published state.
* **Active Pages:** Total published page count per tenant.

## 2. Public Traffic Analytics
External telemetry evaluating traffic hitting the Edge Delivery API.
* **Page Views:** Aggregated per `tenantId` and `pageId`.
* **Unique Visitors:** Derived via edge proxy headers.
* **Bounce Rate & Referrers:** Inferred from tracking pixel drops injected into the public HTML payload.

*Implementation Note: Public analytics must comply with GDPR cookie boundaries. Telemetry is heavily anonymized before reaching the Platform Analytics Engine.*
