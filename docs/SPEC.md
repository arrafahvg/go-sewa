# GO-SEWA

## Full-Stack Rental Booking, Device Management, CRM, CMS, Invoicing & Rental Operations System

You are a senior full-stack software architect, UI/UX designer, product designer, rental management system engineer, database architect, e-commerce engineer, SEO specialist, security engineer, and frontend animation specialist.

Your task is to design and build a **production-ready, scalable, mobile-first website and complete rental management system for “Go-Sewa”**, a business providing rentals for smartphones, cameras, action cameras, 360 cameras, and related accessories.

Examples of rentable products may include:

- iPhone
- Samsung phones
- Android phones
- GoPro
- Insta360
- DJI cameras
- Mirrorless cameras
- Lenses
- Action cameras
- Gimbals
- Microphones
- Tripods
- Power banks
- Chargers
- Memory cards
- Cases
- Other technology and camera equipment

This is NOT a simple landing page or basic booking form.

The system must combine:

1. Modern rental storefront
2. Product catalog
3. Date-based rental availability
4. Real-time inventory availability
5. Individual physical device management
6. Asset and serial number management
7. Shopping cart / rental cart
8. Rental checkout and booking
9. Booking calendar
10. Customer management / CRM
11. Rental order management
12. Device assignment
13. Device check-out and check-in
14. Device condition inspection
15. Before and after rental photo documentation
16. Overdue rental management
17. Deposit management
18. Late fee management
19. Damage and maintenance management
20. Invoice generation
21. Rental agreement generation
22. Printable and downloadable documents
23. CMS
24. Product and device management
25. WhatsApp-based customer communication
26. Optional customer account
27. Bilingual Indonesian / English experience
28. SEO optimization
29. Responsive mobile-first UX
30. Smooth modern animations
31. Role-based admin access
32. Audit logs
33. Future-ready device tracking integration architecture
34. Scalable backend architecture

The final product should feel like a **premium modern technology rental platform and professional rental operations system**, NOT like a generic template, generic e-commerce website, simple booking form, or admin dashboard generated from a boilerplate.

---

# 1. BRAND

Brand name:

**Go-Sewa**

Business category:

Technology and equipment rental.

Primary focus:

Smartphone, camera, action camera, 360 camera, and technology equipment rentals.

Brand positioning:

A modern, trustworthy, convenient, and professional rental platform that makes it easy for customers to rent devices while giving the business owner powerful tools to manage inventory, physical devices, customers, bookings, payments, agreements, and operations.

The brand should feel:

- Modern
- Professional
- Trustworthy
- Technology-focused
- Clean
- Premium
- Efficient
- Convenient
- Reliable
- Friendly
- Travel-friendly
- Creator-friendly

The visual identity should work for customers such as:

- Tourists
- Travelers
- Content creators
- Influencers
- Digital nomads
- Event attendees
- Businesses
- Production teams
- People who need temporary devices
- Customers who want to try a device before buying
- People visiting Bali or other future service locations

Avoid making the design excessively corporate, overly technical, visually cold, cluttered, or similar to a generic electronics marketplace.

The experience should communicate:

**Choose your device. Select your dates. Book easily. Enjoy your rental.**

---

# 2. CORE BUSINESS MODEL

Go-Sewa is a rental business.

Unlike a normal e-commerce store, products are rented for a selected period of time.

The system must support at least:

### A. Device Rental

Customers rent a product for a specific date range.

Example:

Product:

**iPhone 13**

Customer selects:

Rental start:

25 August 2026

Rental end:

28 August 2026

The system calculates:

- Number of rental days
- Applicable rental rate
- Delivery fee if applicable
- Deposit if applicable
- Optional add-ons
- Discount if applicable
- Total estimated/final payment

### B. Equipment Rental

Customers rent equipment such as:

- GoPro
- Insta360
- DJI
- Camera
- Lens
- Microphone
- Gimbal
- Tripod

Each product may have different:

- Daily pricing
- Weekly pricing
- Monthly pricing
- Deposit requirements
- Availability rules
- Rental terms
- Included accessories
- Late fees
- Damage rules

### C. Add-On Rental

Customers can add accessories or additional equipment.

Examples:

- Extra battery
- Power bank
- Memory card
- Tripod
- Microphone
- Waterproof case
- Helmet mount
- Selfie stick

The architecture must allow additional rental categories in the future.

Do NOT build the product system in a way that only supports phones or cameras.

It should be extensible to:

- Electronics
- Photography equipment
- Travel equipment
- Creator equipment
- Event equipment
- Gaming devices
- Laptops
- Tablets
- Drones
- Audio equipment
- Future rental categories

---

# 3. INDIVIDUAL PHYSICAL DEVICE MANAGEMENT

This is one of the MOST IMPORTANT features.

Do NOT treat all products only as generic stock quantities.

Go-Sewa must support both:

### Product Model

Example:

**iPhone 13 128GB**

Total devices:

5

And:

### Individual Physical Devices

Example:

iPhone 13 #GS-IP13-001  
iPhone 13 #GS-IP13-002  
iPhone 13 #GS-IP13-003  
iPhone 13 #GS-IP13-004  
iPhone 13 #GS-IP13-005

Each physical device should have its own identity and history.

Each device may contain:

- Internal asset ID
- Product model
- Serial number
- IMEI where applicable
- Secondary IMEI where applicable
- SKU
- Barcode or QR code
- Purchase date
- Purchase price
- Current status
- Current condition
- Battery health if applicable
- Storage capacity
- Color
- Notes
- Device photos
- Current assigned rental
- Rental history
- Maintenance history
- Damage history
- Last inspection date
- Next maintenance date
- Optional tracking configuration

Example:

Product:

**iPhone 13**

Total devices:

5

Individual status:

- 2 Available
- 2 Rented
- 1 Maintenance

Public availability:

**2 Available**

The public website must automatically calculate availability from actual physical device status and rental date conflicts.

Do NOT require the admin to manually update the public website when a device is rented or returned.

The database must be the source of truth.

---

# 4. DEVICE STATUS SYSTEM

Each physical device should support a proper lifecycle.

Suggested statuses:

available  
reserved  
rented  
overdue  
returning  
inspection  
maintenance  
damaged  
lost  
retired  
blocked

Definitions:

### Available

The device can be assigned to a new rental.

### Reserved

The device is reserved for an upcoming confirmed booking.

### Rented

The device is currently with a customer.

### Overdue

The expected return time has passed and the device has not been checked in.

### Returning

The customer is currently returning the device.

### Inspection

The device has been returned but must be inspected before becoming available again.

### Maintenance

The device is temporarily unavailable because it requires maintenance or repair.

### Damaged

The device has a damage issue and cannot be rented until resolved.

### Lost

The device is reported lost or missing.

### Retired

The device is permanently removed from rental inventory.

### Blocked

The device is temporarily unavailable because the admin manually blocked it.

The system should NOT allow a device to be booked if its status makes it unavailable.

---

# 5. DATE-BASED RENTAL AVAILABILITY

This is critical.

Availability must NOT only show the number of devices currently available at this exact moment.

The system must calculate availability based on the customer's selected rental dates.

Example:

GoPro Hero 12

Total active devices:

5

Existing rentals:

Device #01:
25 Aug to 28 Aug

Device #02:
25 Aug to 27 Aug

Device #03:
26 Aug to 29 Aug

Device #04:
Maintenance

Device #05:
Available

If a customer searches:

25 Aug to 27 Aug

Available quantity:

1

If another customer successfully confirms the final available device:

Show:

**Not Available for Selected Dates**

The system must consider:

- Existing confirmed bookings
- Active rentals
- Reserved devices
- Maintenance periods
- Damage periods
- Manual availability blocks
- Optional turnaround/checking buffer
- Device retirement
- Date and time conflicts

Do NOT allow overselling.

---

# 6. RENTAL AVAILABILITY ENGINE

Create a robust availability engine.

Conceptually:

available devices for selected dates

=

active rentable devices

− devices assigned to overlapping confirmed bookings

− devices assigned to overlapping active rentals

− devices in maintenance

− damaged devices

− lost devices

− blocked devices

The overlap logic must be implemented correctly.

For example:

Existing booking:

25 Aug 10:00  
to  
28 Aug 10:00

Another booking should not overlap unless the system's configured turnaround rules allow it.

The architecture must support:

- Date-based rentals
- Date and time-based rentals
- Configurable rental durations
- Pickup times
- Return times
- Turnaround buffer
- Cleaning/checking buffer
- Maintenance blocks

Availability validation must happen server-side.

Do NOT rely only on frontend calculations.

Two customers attempting to book the last available device at almost the same time must not both successfully reserve the same physical device.

Use appropriate transactions, locking, constraints, or robust reservation logic.

---

# 7. WEBSITE STRUCTURE

Create a modern website with the following major sections.

## PUBLIC STOREFRONT

### Home

Sections should include:

1. Hero section
2. Featured rental devices
3. Popular categories
4. How it works
5. Featured phones
6. Featured cameras
7. Action camera section
8. Insta360 / 360 camera section
9. Why rent with Go-Sewa
10. Rental availability / booking CTA
11. Customer testimonials
12. Trust and safety section
13. WhatsApp CTA
14. FAQ
15. Footer

Hero CTA examples:

"Rent a Device"

"Browse Cameras"

"Check Availability"

"Book Your Rental"

Do not blindly use this copy if better Go-Sewa-oriented copy can be created.

---

# 8. NAVIGATION

Desktop navigation:

- Home
- Rent
- Phones
- Cameras
- Action Cameras
- Accessories
- How It Works
- About
- FAQ

Right side:

- Language toggle
- Search
- Rental cart
- Optional account/profile

Mobile navigation must be optimized specifically for mobile.

A possible mobile bottom navigation:

Home  
Rent  
Search  
Cart  
Menu

Do not simply shrink the desktop navigation.

Design the mobile experience intentionally.

The booking process must be especially comfortable on mobile.

---

# 9. LANGUAGE SYSTEM

The website must support:

### Indonesian

Default language.

### English

Provide a language toggle.

Example:

ID | EN

The language system must be implemented properly using localization/i18n.

DO NOT duplicate the entire application just to support two languages.

All user-facing strings must come from translation files or an equivalent scalable translation architecture.

Example:

/locales/id/  
/locales/en/

The following must support translation:

- Navigation
- Product information
- Rental instructions
- Availability messages
- Buttons
- Booking flow
- Cart
- Checkout
- Rental agreement labels
- Invoice labels
- Error messages
- Validation
- CRM labels
- CMS content where appropriate
- SEO metadata
- FAQ
- Empty states
- Notifications

The URL architecture should also be SEO-friendly.

For example:

/id/rent  
/en/rent

or another technically appropriate localized URL structure.

---

# 10. RENTAL SHOPPING EXPERIENCE

The storefront must behave like a real modern rental platform.

Users should be able to:

- Browse devices
- Search devices
- Filter devices
- Sort devices
- View product details
- Select rental dates
- Select pickup and return time where applicable
- Check availability
- Select quantity where multiple devices are available
- Add products to rental cart
- Add accessories
- Update rental dates
- Remove rental items
- See rental price breakdown
- See deposit requirements
- See delivery estimate
- Checkout / submit booking
- Contact Go-Sewa through WhatsApp

The rental cart should persist appropriately.

If the user refreshes the page, the cart should not unexpectedly disappear.

Use local persistence or backend persistence depending on authentication architecture.

---

# 11. PRODUCT DETAIL PAGE

Every rental product should have:

- Product name
- Product images
- Image gallery
- Daily rental price
- Weekly rental price if applicable
- Monthly rental price if applicable
- Deposit requirement
- Availability status
- Available quantity for selected dates
- Rental date picker
- Pickup/return time picker if applicable
- Quantity selector
- Description
- Full specifications
- Included accessories
- Optional add-ons
- Device requirements
- Rental terms
- Late fee information
- Damage/loss information
- Pickup/delivery options
- Related products
- Add to rental cart
- Rent now
- WhatsApp CTA

Example CTA:

"Need help choosing a device? Chat with us on WhatsApp."

The date picker must be a functional part of availability calculation.

Do NOT show a fake calendar.

When a customer selects dates, availability and pricing must update accordingly.

---

# 12. RENTAL DATE PICKER

Create a high-quality date selection experience.

Customer selects:

### Rental start

Date and optional time.

### Rental end

Date and optional time.

The system should:

- Prevent invalid date ranges
- Prevent end date before start date
- Enforce minimum rental duration if configured
- Calculate rental duration
- Show unavailable dates where appropriate
- Check availability after date selection
- Update pricing
- Update available quantity
- Show clear availability feedback

Examples:

**Available**

**Only 1 device left**

**Unavailable for selected dates**

**Choose different dates**

The admin must be able to configure:

- Minimum rental duration
- Maximum rental duration
- Booking advance rules
- Turnaround buffer
- Pickup hours
- Return hours
- Same-day rental rules

Do NOT hardcode these business rules throughout the application.

---

# 13. RENTAL PRICING ARCHITECTURE

Do NOT hardcode rental prices.

Create a configurable rental pricing engine.

Example:

Daily rate × number of rental days

+

Optional add-ons

+

Delivery fee

+

Optional insurance/protection fee

+

Other configurable fees

=

Rental subtotal

Deposit should be tracked separately where applicable.

Example:

Daily rental:

Rp100.000

3 days:

Rp300.000

Delivery:

Rp30.000

Optional extra battery:

Rp20.000

Rental subtotal:

Rp350.000

Deposit:

Rp1.000.000

Total due before rental:

Rp1.350.000

The system must clearly distinguish:

- Rental fee
- Deposit
- Delivery fee
- Add-ons
- Discounts
- Damage charges
- Late charges
- Refundable amounts

Do not treat all payments as one generic total.

---

# 14. FLEXIBLE PRICING RULES

The system should support:

- Daily pricing
- Weekly pricing
- Monthly pricing
- Weekend pricing
- Seasonal pricing
- Promotional pricing
- Custom pricing
- Long-term rental pricing
- Deposit requirements
- Optional protection fees

Example:

1 day:

Rp150.000/day

3 days:

Rp120.000/day

7 days:

Rp700.000 package

The architecture should support pricing rules without requiring source-code changes for every future pricing adjustment.

Admin should be able to manage core pricing from CMS/admin.

---

# 15. PICKUP VS DELIVERY

Customer must choose a fulfillment method.

### Pickup

Customer collects the rented device.

### Delivery

Go-Sewa or a third-party courier delivers the device.

### Return Method

The system should also support return instructions.

For example:

- Customer returns to pickup location
- Go-Sewa collects the device
- Courier return
- Custom arrangement

Do NOT build the system around a specific courier provider unless explicitly configured.

Create a delivery abstraction so courier providers can be added later.

Rental should contain:

fulfillment_method:

pickup  
delivery

Return should contain:

return_method:

return_to_location  
pickup_collection  
courier_return

For delivery:

- Delivery address
- Recipient name
- Recipient phone
- Delivery notes
- Estimated delivery fee
- Delivery status
- Courier information if integrated later

The admin should be able to manage delivery manually initially.

### Admin-Reviewed Pricing & Delivery Fee

The delivery fee shown at checkout is an **estimate** based on the configurable
`delivery_fee_cents` setting. The authoritative flow is:

1. The customer submits an order. Online orders are created with status `pending`
   (§17) — nothing is confirmed and no device is finally allocated to the customer yet.
2. Staff receive an **in-app notification** ("new online order awaiting review") via
   the `notifications` table so the order is never silently missed.
3. While the booking status is `pending` or `awaiting_confirmation`, an admin can
   **adjust the delivery fee and per-line prices** on the booking detail screen.
   These edits update that booking's stored snapshot values (booking items, fee) —
   this is legitimate because the booking is not yet historical (§58 protects only
   completed/historical records). Every adjustment is audit-logged (§63).
4. Once staff confirm the booking, amounts freeze: later changes must go through
   cancellation/re-creation or explicit amendment flows, never silent mutation.
5. The customer sees the final amount when staff confirm via WhatsApp/phone (§18);
   checkout copy must make clear that the total is indicative until confirmation.

---

# 16. PAYMENT ARCHITECTURE

Do not assume a specific payment gateway unless explicitly configured.

Build the system so payment methods can be added later.

Possible payment methods:

- Bank transfer
- E-wallet
- QRIS
- Payment gateway
- Cash
- Cash on pickup

The architecture must separately support:

Rental payment status:

unpaid  
pending  
partially_paid  
paid  
failed  
refunded

Deposit status:

not_required  
pending  
held  
partially_returned  
returned  
partially_forfeited  
forfeited

Do not hardcode payment logic into the UI.

The system must preserve a complete payment history.

---

# 17. RENTAL ORDER STATUS

Create a proper rental lifecycle.

Suggested statuses:

draft  
pending  
awaiting_confirmation  
confirmed  
payment_pending  
partially_paid  
paid  
reserved  
ready_for_pickup  
out_for_delivery  
active_rental  
return_due  
overdue  
returned  
inspection  
completed  
cancelled  
refunded

The admin should be able to update status where appropriate.

Some statuses should also be updated automatically.

Example:

If the expected return time has passed and the device is still active:

active_rental

→

overdue

Customers should see understandable status labels.

---

# 18. WHATSAPP INTEGRATION

This is one of the MOST IMPORTANT features.

Create a persistent floating WhatsApp CTA on the website.

Examples:

"Need help? Chat with us"

"Ask about this device"

"Contact Go-Sewa"

The button should:

- Float above content
- Work on mobile and desktop
- Be visible without being intrusive
- Have subtle animation
- Open WhatsApp
- Pre-fill contextual messages when appropriate

For example, on a product:

"Hi Go-Sewa, I'm interested in renting the iPhone 13."

For a booking:

"Hi Go-Sewa, I'd like to ask about booking #GS-20260822-001."

For an overdue reminder:

This should be generated by the admin system, not necessarily exposed publicly.

The WhatsApp number must be configurable from CMS/settings.

DO NOT hardcode the WhatsApp number in multiple components.

---

# 19. BOOKING CHECKOUT

Checkout must be simple and mobile-friendly.

Required customer fields:

- Full name
- WhatsApp number
- Email if required/configurable
- Address if required
- Rental start date
- Rental end date
- Pickup/delivery option
- Return option
- Identity verification requirements where applicable
- Notes

Depending on the business configuration, the system may request:

- ID card/passport information
- Document upload
- Identity verification status

Important:

Sensitive customer information must be handled securely.

The checkout should clearly communicate:

- Rental period
- Total rental fee
- Deposit
- Delivery fee
- Included accessories
- Expected pickup/delivery process
- Return date
- Rental terms

Example:

"We'll contact you via WhatsApp to confirm your rental booking."

---

# 19B. ADMIN-INITIATED (WALK-IN / IN-STORE) BOOKING

Not every rental starts on the public website.

A customer may walk into the store, call, or message on WhatsApp, choose a device in person, and expect to leave with it the same day.

The admin must be able to create a complete rental record for this scenario without the customer ever touching the public checkout.

This is NOT a separate booking system.

It must create the exact same booking, booking items, and pricing snapshot records as the public checkout (Section 19, Section 64), through the same validation and availability logic (Section 6, Section 57).

Do NOT build a second, simplified "manual booking" path that skips availability checks, skips pricing rules, or skips conflict prevention. A walk-in device is exactly as bookable, or unavailable, as an online one.

### Entry points

- "Add Rental" quick action on the Admin Dashboard (Section 43)
- "+ New Rental" button on /admin/bookings

### Flow

A single guided form, not the multi-step public funnel:

**Step 1: Customer**

Search existing customers by name or WhatsApp number.

Or create a new customer inline with the minimum required fields (name, WhatsApp number). Full address, email, and ID/document upload stay optional or configurable, same rule as Section 19.

**Step 2: Product and device**

Select a product.

Immediately show which individual physical devices are free for the chosen dates, reusing the same availability engine as the public site.

Let the admin pick the exact asset (example: IP13-004) directly in this step, instead of forcing "reserve product now, assign device later." Staff already has the unit in hand.

**Step 3: Rental period**

Start date defaults to today, editable.

End date follows the same daily/weekly/monthly pricing rules as online (Section 13, Section 14).

**Step 4: Pricing**

Auto-calculated from the same pricing engine as the storefront. Never a second, hardcoded price field.

Allow an admin-only discount override for in-person negotiation, but require a short reason note. Log it (Section 63).

**Step 5: Deposit and payment**

Record method (cash, transfer, QRIS, etc., Section 16), amount collected, and payment/deposit status immediately. Most walk-ins pay on the spot; do not force the booking through an "awaiting confirmation" state that only makes sense for online orders.

**Step 6: Agreement**

Generate the same rental agreement (Section 21) for print and physical signature, or capture it as an in-person acceptance record (Section 20) instead of the online checkbox flow.

**Step 7: Optional immediate check-out**

Since the device is often leaving with the customer right now, let the admin complete the Device Check-out checklist (Section 23) as the last step of this same form, instead of saving the booking and navigating separately to check-out.

### Confirmation

Generate the booking number exactly as in Section 64, using the same booking-creation service. Only the intake source differs.

Sending a WhatsApp confirmation is optional here (the customer is already physically present) but should remain available for their records.

### Data integrity rules

- Every walk-in booking must pass through the same availability and conflict-prevention logic as an online booking (Section 6). No shortcuts.
- Every booking stores its channel: `online`, `in_store`, `phone`, or `whatsapp`. This powers the online-vs-offline breakdown on the dashboard and in analytics (Section 43, Section 62).
- Every admin-created booking stores which staff member created it, feeding the audit log (Section 63).
- Historical pricing snapshot rules (Section 58) apply identically regardless of channel.

---

# 20. RENTAL AGREEMENT ACCEPTANCE

Before completing the booking, customers should be able to:

- View rental terms
- Review rental agreement
- Confirm agreement acceptance

The system should record:

- Agreement version
- Customer acceptance
- Acceptance timestamp
- Booking ID
- Optional IP/device metadata where legally appropriate

Do NOT rely only on a generic checkbox if the business requires a formal agreement workflow.

The architecture should support:

- Online acceptance
- PDF agreement
- Printed agreement
- Digital signature
- Manual signature

---

# 21. RENTAL AGREEMENT GENERATOR

This is a major feature.

Admin should be able to automatically generate a rental agreement using booking and customer data.

The agreement should support:

### Go-Sewa Information

- Brand name
- Logo
- Business address
- Contact information

### Customer Information

- Full name
- WhatsApp number
- Email
- Address
- Identity information where legally appropriate

### Rental Information

- Rental number
- Rental start
- Rental end
- Expected return date/time
- Pickup/delivery details

### Device Information

- Product name
- Assigned asset ID
- Serial number
- IMEI where applicable
- Included accessories
- Device condition

### Financial Information

- Rental fee
- Deposit
- Delivery fee
- Late fee policy
- Damage policy
- Loss policy

### Agreement Terms

- Customer responsibilities
- Prohibited use
- Damage responsibility
- Loss responsibility
- Late return rules
- Deposit rules
- Privacy/data responsibility
- Device return requirements

The agreement should be:

- Previewable
- Printable
- Downloadable as PDF
- Sendable to the customer
- Versioned

The admin must be able to customize agreement templates without changing source code.

# 21B. DOCUMENT TEMPLATES, PDF & SHARING

Templates for rental agreements AND invoices must be editable by staff in the
admin console (`/admin/templates`) through structured fields — document title,
intro line, terms (one per line), footer note, signature-line toggle — with a
live preview. Staff never edit raw HTML. Saving:

- stores the fields and renders them into the stored template body;
- bumps the template version;
- is audit-logged (§63);
- offers to re-render existing DRAFT agreements with the new version via a
  confirmation dialog. Signed/printed agreements and paid invoices are never
  modified; item/pricing data always comes from booking snapshots (§58).

Every invoice and agreement document must support:

- Print (browser print dialog, print-styled page);
- Download as a real `.pdf` file rendered from the on-screen document;
- Share via WhatsApp and email using a public read-only link `/d/<token>`.
  The token is an unguessable UUID minted (and revocable) by staff through an
  audit-logged action. The shared view exposes only the document facts already
  printed — no admin access, no ID-document images, no internal notes.

---

# 22. DEVICE ASSIGNMENT

A booking should initially reserve product availability.

The system should support assigning actual physical devices to the booking.

Example:

Booking:

GS-20260822-001

Customer rents:

iPhone 13 × 2

Admin assigns:

IP13-001  
IP13-004

The system must prevent the same physical device from being assigned to conflicting rentals.

Assignment should happen:

- Automatically if configured
- Manually by admin
- During check-out

The architecture should support both automatic and manual assignment.

---

# 23. DEVICE CHECK-OUT

Create a dedicated device handover workflow.

When the customer receives the device, admin should perform a check-out.

Show:

Rental number  
Customer  
Device  
Asset ID  
Serial number/IMEI  
Rental period  
Expected return

Create a checklist.

Example:

- Device powers on
- Screen condition checked
- Camera condition checked
- Battery condition checked
- Charger included
- Cable included
- Case included
- Memory card included
- Extra battery included
- Other accessories included

Admin should be able to:

- Mark checklist items
- Add notes
- Upload photos
- Record device condition
- Capture customer acknowledgment if implemented
- Confirm handover

After successful check-out:

Device status:

rented

Rental status:

active_rental

---

# 24. DEVICE CHECK-IN

When the device is returned, admin should perform a check-in.

The system should show:

- Expected return date/time
- Actual return date/time
- Overdue duration if applicable
- Assigned devices
- Original check-out condition
- Original check-out photos
- Included accessories

Admin should inspect:

- Device functionality
- Screen
- Camera
- Battery
- Body condition
- Accessories
- New damage
- Missing items

Admin should be able to:

- Upload after-return photos
- Add inspection notes
- Mark damage
- Mark missing accessories
- Calculate late fees
- Create damage charges
- Approve deposit return

After return:

Device status should NOT automatically become:

available

The correct lifecycle should be:

rented

↓

returning

↓

inspection

↓

available

OR:

maintenance

OR:

damaged

This prevents a returned but unchecked device from immediately appearing as available to customers.

---

# 25. DEVICE CONDITION REPORTS

Each device should maintain condition history.

At minimum:

### Before Rental

- Inspection date
- Inspector
- Condition notes
- Photos
- Checklist
- Existing damage

### After Rental

- Inspection date
- Inspector
- Condition notes
- Photos
- New damage
- Missing accessories
- Repair required

The system should compare the before and after rental records.

This is important for:

- Damage disputes
- Customer accountability
- Maintenance history
- Insurance
- Asset management

---

# 26. DAMAGE MANAGEMENT

Admin should be able to record:

- Damage type
- Description
- Severity
- Date discovered
- Related rental
- Related customer
- Photos
- Estimated repair cost
- Actual repair cost
- Customer charge
- Insurance coverage if applicable
- Repair status

Suggested damage statuses:

reported  
under_review  
customer_notified  
repairing  
resolved  
written_off

Damage records should be linked to:

- Device
- Rental
- Customer where applicable

Do not lose historical damage information when a device is repaired.

---

# 27. MAINTENANCE MANAGEMENT

Each physical device should support maintenance management.

Store:

- Device
- Maintenance date
- Maintenance type
- Problem description
- Technician/vendor
- Cost
- Notes
- Before/after condition
- Next maintenance date
- Device downtime

Suggested maintenance statuses:

scheduled  
in_progress  
completed  
cancelled

When a device is in maintenance:

It must not be counted as publicly available.

Admin dashboard should show:

- Devices currently under maintenance
- Upcoming maintenance
- Maintenance costs
- Devices unavailable for long periods

---

# 28. OVERDUE MANAGEMENT

Create an automatic overdue system.

If:

current date/time

>

expected return date/time

and the device has not been checked in:

Rental status:

overdue

Device status:

overdue

The dashboard should prominently display:

- Overdue customer
- Device
- Asset ID
- Expected return
- Time overdue
- Contact information
- Outstanding payment
- Estimated late fee

Admin should be able to:

- Contact customer through WhatsApp
- Extend rental
- Apply late fee
- Add notes
- Escalate internally

Late fee calculation should be configurable.

Example:

late_fee_type:

hourly  
daily  
fixed  
custom

Do NOT hardcode late fees.

---

# 29. RENTAL EXTENSION

Customers or admin should be able to request a rental extension.

The system must check availability before approving the extension.

Example:

Customer wants to extend:

28 Aug

to:

30 Aug

Before approval, check whether the same device is already reserved for another customer.

If no conflict:

Approve extension.

Update:

- Expected return date
- Pricing
- Payment requirement
- Rental agreement if necessary
- Availability

If conflict exists:

Do NOT silently approve.

Show:

"This device is already reserved for another booking after your current rental period."

The admin may then offer an alternative solution.

---

# 30. DEPOSIT MANAGEMENT

Deposit management must be a dedicated system.

Track:

- Deposit required
- Deposit amount
- Deposit paid
- Deposit payment date
- Deposit method
- Deposit status
- Deposit held
- Deposit deductions
- Deposit refund
- Deposit refund date
- Deposit refund method

Example:

Deposit:

Rp1.000.000

After return:

No damage  
No overdue

Deposit refund:

Rp1.000.000

If:

Late fee:

Rp100.000

Damage:

Rp250.000

Deposit refund:

Rp650.000

The system should preserve the full financial calculation.

Do not simply overwrite the original deposit amount.

---

# 31. CUSTOMER CRM

Create a modern CRM inside the admin application.

The CRM should not be an afterthought.

Main customer profile should store:

- Full name
- WhatsApp number
- Email
- Address
- Customer status
- Identity verification status
- Total rentals
- Total rental spending
- Total deposit history
- Last rental
- Current active rentals
- Overdue history
- Damage history
- Notes
- Tags
- Created date

Optional internal customer flags may include:

standard  
verified  
priority  
manual_review  
restricted

These flags must be protected from public access.

# 31B. CUSTOMER DETAIL VIEW (CRM)

The customer list (`/admin/customers`) must not be a dead end or a static card
list (see §80). Every customer name/row in the list is clickable and opens the
customer detail page `/admin/customers/[id]`.

The detail page must show, all read from the database (§81):

- Profile header: full name, WhatsApp number, email, address, ID type and
  masked ID number, identity verification status (§52: label text, not color
  alone), tags, customer-since date.
- Lifetime stats: total bookings, active rentals, total spending, last rental.
- Identity documents on file (from `customer_documents`): staff open them via
  short-lived signed URLs only — never public links; verification action here
  is audit-logged (§63).
- Full rental history: every booking with dates, item snapshots (§58), status,
  total — each linking to its booking detail — plus deep links to that
  booking's generated invoice and rental agreement when they exist.
- Editable contact details: an "Edit details" action allowing staff to update
  name, phone/WhatsApp, email, address and internal notes through a guarded
  server action with server-side validation and an audit-log entry (§54, §59,
  §63). Internal notes are never shown to customers.
- A WhatsApp quick-contact button using the customer's stored number so staff
  can reach them directly (§18, §34).

The detail page renders the §32 customer activity timeline: every audit-log
entry for this customer and their bookings, newest first, with human-readable
labels, metadata context (status transitions, damage noted, device counts,
edited fields) and links to the affected booking.

Empty states are explicit: no bookings yet / no document on file. The detail
page never invents data (§80).

---

# 32. CUSTOMER TIMELINE

Each customer should have an activity timeline.

Example:

Customer created  
↓  
Identity verified  
↓  
Booked iPhone 13  
↓  
Payment received  
↓  
Device checked out  
↓  
Rental extended  
↓  
Device returned  
↓  
Inspection completed  
↓  
Deposit refunded  
↓  
Rental completed

This helps the business understand the complete customer relationship.

---

# 33. LEADS

Support leads for customers who inquire but have not completed a booking.

Store:

- Name
- WhatsApp
- Email if available
- Source
- Interested product
- Interested rental dates
- Notes
- Status
- Assigned staff
- Created date

Lead statuses:

New  
Contacted  
Interested  
Quotation Sent  
Booking Pending  
Won  
Lost

The architecture should allow a lead to be converted into a customer without manually recreating all information.

---

# 34. RENTAL ORDER MANAGEMENT

Admin should be able to:

- Create a new rental directly for a walk-in, phone, or WhatsApp customer (Section 19B)
- View rentals
- Search rentals
- Filter rentals
- Update status
- View customer
- View rental items
- View assigned physical devices
- View serial numbers/IMEI
- View rental period
- View payment status
- View deposit status
- View delivery method
- View check-out records
- View return records
- Add notes
- Contact customer through WhatsApp
- Generate invoice
- Generate rental agreement
- Download documents
- Extend rental
- Process return

Filters should include:

- Rental status
- Payment status
- Deposit status
- Date range
- Product
- Device
- Overdue
- Pickup/delivery
- Assigned staff

---

# 35. INVOICE SYSTEM

The admin must support invoice generation.

Invoice should contain:

- Go-Sewa branding
- Logo
- Invoice number
- Invoice date
- Rental number
- Customer information
- WhatsApp number
- Billing details
- Rental items
- Rental period
- Number of rental days
- Quantity
- Unit rental price
- Add-ons
- Delivery fee
- Deposit
- Discount
- Damage fee if applicable
- Late fee if applicable
- Subtotal
- Total
- Payment status
- Notes
- Terms

The invoice must be:

- Previewable
- Printable
- Downloadable
- Sendable to customer

Prefer reliable PDF generation or print-optimized HTML.

---

# 36. INVOICE TEMPLATE BUILDER

This is an important CMS feature.

Admin should be able to customize invoice templates without changing source code.

Allow configurable:

- Logo
- Brand name
- Address
- WhatsApp
- Email
- Header
- Footer
- Colors
- Font choices
- Visible fields
- Notes
- Terms
- Invoice numbering format

Potential template system:

invoice_templates

with configurable JSON structure.

Example:

{
"header": {...},
"branding": {...},
"rental_details": {...},
"columns": [...],
"totals": {...},
"footer": {...}
}

Admin should be able to preview the invoice before saving.

---

# 37. RENTAL AGREEMENT TEMPLATE BUILDER

Admin should also be able to manage rental agreement templates.

Allow configurable:

- Logo
- Brand name
- Header
- Agreement title
- Agreement content
- Terms and conditions
- Device information fields
- Customer information fields
- Financial fields
- Signature section
- Footer
- Agreement numbering format

Use structured placeholders.

Example:

{{customer_name}}

{{rental_number}}

{{rental_start}}

{{rental_end}}

{{device_name}}

{{asset_id}}

{{serial_number}}

{{deposit_amount}}

The system should render the agreement using actual booking data.

Admin should be able to preview the agreement before saving.

---

# 38. CMS

Create a powerful but simple CMS.

Admin should be able to manage:

### Products

- Create
- Edit
- Archive/delete where appropriate
- Publish/unpublish
- Rental prices
- Pricing rules
- Deposit requirements
- Images
- Categories
- Tags
- Specifications
- Included accessories
- Optional add-ons
- Rental terms
- SEO metadata

### Physical Devices

- Create
- Edit
- Archive
- Assign to product
- Asset ID
- Serial number
- IMEI
- QR/barcode
- Purchase information
- Current status
- Current condition
- Photos
- Maintenance history

This is critical because the owner should be able to manage actual rental inventory without developer intervention.

---

# 39. PRODUCT AND DEVICE INVENTORY

The system must distinguish:

### Product Inventory

Example:

iPhone 13

Total physical devices:

5

### Device Inventory

IP13-001  
IP13-002  
IP13-003  
IP13-004  
IP13-005

Do NOT only store:

stock_quantity = 5

The system must know which exact devices exist.

The system should support:

- Total device count
- Available count
- Reserved count
- Rented count
- Maintenance count
- Damaged count
- Lost count
- Blocked count

Public availability should be calculated automatically.

---

# 40. QR CODE / BARCODE ASSET MANAGEMENT

Each physical device should optionally support:

- QR code
- Barcode
- Internal asset label

Admin/staff should be able to scan a device when:

- Checking out
- Checking in
- Inspecting
- Moving to maintenance

Example:

Scan:

GS-GOPRO-001

System opens the correct device record.

The system should not require QR/barcode functionality to block basic rental operations if a scanner is unavailable.

Manual search must also work.

---

# 41. OPTIONAL DEVICE TRACKING ARCHITECTURE

Design the architecture to support future device tracking.

Important:

Do NOT claim that Go-Sewa can automatically track every iPhone, GoPro, Insta360, or camera using GPS without compatible hardware, authorized software, or supported integrations.

Instead, create a clean integration architecture.

Potential tracking sources:

- GPS hardware
- IoT trackers
- MDM/device management systems
- Manufacturer-supported APIs
- Authorized tracking providers

Suggested tracking architecture:

device

↓

tracking_configuration

↓

tracking_provider

↓

telemetry/events

↓

admin dashboard

Each tracking record may support:

- Provider
- External device ID
- Tracking enabled/disabled
- Last known location
- Last location timestamp
- Battery status if supported
- Connection status
- Provider metadata

Location tracking must respect:

- Privacy
- Customer disclosure
- Applicable laws
- Consent requirements where applicable

Do NOT create fake live tracking UI.

If no real tracking provider is connected:

Show:

"Tracking integration not configured"

or another honest state.

---

# 42. CONTENT CMS

Admin should be able to edit:

- Homepage hero
- Homepage sections
- Featured categories
- Featured products
- How it works
- Why Go-Sewa
- Trust and safety content
- FAQ
- About
- Testimonials
- Promotional banners
- Footer
- WhatsApp CTA
- SEO metadata

Use structured content instead of storing everything as raw HTML.

---

# 43. ADMIN DASHBOARD

Create a beautiful modern admin dashboard.

Dashboard cards:

- Today's Pickups
- Today's Returns
- Pending Bookings
- Active Rentals
- Overdue Rentals
- Available Devices
- Reserved Devices
- Devices in Maintenance
- Revenue
- Deposits Currently Held
- New Customers
- New Leads

Charts:

- Revenue over time
- Rentals over time
- Most rented products
- Product utilization
- Rental duration
- Overdue rate
- Maintenance cost over time
- Customer acquisition

Recent rentals table.

Upcoming pickups.

Upcoming returns.

Overdue alerts.

Recent customer activity.

Quick actions:

- Add Rental (opens the walk-in/in-store booking flow, Section 19B)
- Add Customer
- Add Product
- Add Device
- Check Out Device
- Check In Device
- Manage Inventory
- Create Invoice
- Create Agreement
- Edit CMS

---

# 44. SEARCH

Global storefront search should search:

- Product names
- Categories
- Tags
- Device types
- Brands
- Specifications

Admin search should search:

- Customers
- Leads
- Rentals
- Products
- Physical devices
- Asset IDs
- Serial numbers
- IMEI
- Invoices
- Agreements

Use debounced search.

Avoid unnecessary API calls.

---

# 45. FILTERING

Product filtering should support:

- Category
- Brand
- Price
- Availability
- Rental duration
- Device type
- Specifications
- Popularity

Admin filters should support:

- Device status
- Rental status
- Date range
- Overdue
- Maintenance
- Customer
- Product
- Payment status
- Deposit status

Mobile filters should use a bottom sheet or drawer.

---

# 46. SEO

SEO is a HIGH PRIORITY.

Implement:

- Semantic HTML
- Proper H1/H2/H3 hierarchy
- Metadata
- Open Graph metadata
- Twitter/X cards
- Canonical URLs
- Sitemap
- Robots.txt
- Structured data
- Product schema
- Organization schema
- Breadcrumb schema
- FAQ schema where appropriate

Product pages should have unique:

- Title
- Description
- Metadata
- Slug

Example:

/id/rent/iphone-13

Avoid:

/product?id=123

where possible.

Images must have descriptive alt text.

Optimize images for:

- WebP/AVIF
- Responsive sizes
- Lazy loading
- Proper dimensions

---

# 47. PERFORMANCE

The website must be fast.

Prioritize:

- Lazy loading
- Code splitting
- Image optimization
- Component-level loading
- Server-side rendering or static generation where appropriate
- Caching
- Efficient database queries
- Pagination
- Debouncing
- Avoid unnecessary client-side rendering

The rental availability engine must remain accurate even when pages are cached.

Do not cache availability in a way that allows customers to book devices that are no longer available.

Separate:

Stable product content

from

Dynamic rental availability

where appropriate.

---

# 48. RESPONSIVE DESIGN

Design for:

- 320px
- 375px
- 390px
- 430px
- Tablet
- Laptop
- Large desktop

Mobile is NOT a secondary version.

Design mobile first.

Ensure:

- Buttons are thumb-friendly
- Text is readable
- Product cards adapt properly
- Date selection is easy
- Rental checkout is simple
- Availability is easy to understand
- Agreements are readable
- Admin dashboard is usable on tablet/mobile where practical

---

# 49. UI/UX PRINCIPLES

Use advanced UI/UX principles.

Important:

- Clear visual hierarchy
- Strong typography
- Consistent spacing
- Accessible contrast
- Predictable interaction
- Minimal cognitive load
- Progressive disclosure
- Good empty states
- Good loading states
- Good error states
- Good success states
- Clear CTAs

Rental pricing must be transparent.

Customers should never be surprised by:

- Deposit
- Delivery fee
- Late fees
- Required return date

Do not overcrowd the UI.

---

# 50. ANIMATION

Animations should feel modern and premium.

Use:

- Fade
- Slide
- Scale
- Micro-interactions
- Hover states
- Smooth page transitions
- Cart animations
- Date selection transitions
- Modal transitions

Avoid:

- Excessive bouncing
- Random animation
- Slow animations
- Animation on every element

Respect:

prefers-reduced-motion

Animation should improve usability rather than become visual noise.

---

# 51. DESIGN SYSTEM

Create a reusable design system.

Define:

- Colors
- Typography
- Spacing
- Border radius
- Shadows
- Buttons
- Inputs
- Date pickers
- Product cards
- Availability badges
- Status badges
- Modals
- Toasts
- Dropdowns
- Tabs
- Tables
- Timeline components
- Checklists
- Skeleton loaders

Use reusable components.

Do not duplicate UI code.

---

# 52. ACCESSIBILITY

Implement:

- Semantic HTML
- Keyboard navigation
- Focus states
- ARIA where necessary
- Accessible forms
- Proper labels
- Alt text
- Color contrast
- Screen-reader-friendly states

Do not communicate important device status only through color.

For example:

Do not only use a red badge.

Also display:

Overdue

---

# 53. SECURITY

The system must follow secure application practices.

Implement:

- Authentication
- Authorization
- Role-based access
- Server-side validation
- Input sanitization
- Protected admin routes
- Secure database policies
- Environment variables
- No secrets in frontend
- Rate limiting where appropriate
- File upload validation
- Secure document handling
- Secure customer data handling
- Secure storage access

Never expose:

- API keys
- Database credentials
- Service role keys
- Private environment variables
- Sensitive customer documents

to the client.

---

# 54. ADMIN ROLES

At minimum:

### Owner/Admin

Full access.

### Staff

Can manage permissions configured by owner.

Potential staff permissions:

- View/manage bookings
- Create walk-in/offline bookings (Section 19B)
- Check out devices
- Check in devices
- Manage customers
- Manage leads
- Manage inventory
- View invoices

Staff should NOT automatically have access to:

- Critical settings
- User management
- Tracking provider configuration
- Sensitive financial configuration
- Security settings

Architecture should support additional roles later.

---

# 55. DATABASE

Create a normalized scalable relational database.

Suggested entities:

users  
roles  
permissions  
customers  
customer_documents  
customer_tags  

leads  

categories  
products  
product_variants  
product_images  
rental_pricing_rules  
rental_add_ons  

devices  
device_accessories  
device_images  
device_condition_reports  
device_maintenance  
device_damage_reports  
device_tracking_configurations  
device_tracking_events  
availability_blocks  

bookings  
booking_items  
booking_device_allocations  
booking_extensions  
booking_notes  

device_checkouts  
device_checkins  
inspection_checklists  

payments  
deposits  
deposit_transactions  
late_fees  
damage_charges  

rental_agreements  
agreement_templates  
agreement_acceptances  
agreement_signatures  

invoices  
invoice_templates  

delivery_details  
return_details  

cms_pages  
cms_sections  
faq  
testimonials  
settings  

activity_logs  
notifications  

Do not blindly create every table if unnecessary.

Design proper relationships.

Use:

Primary keys  
Foreign keys  
Indexes  
Unique constraints  
Timestamps  
Soft delete where appropriate

---

# 56. DEVICE DATA MODEL

A physical device should NOT be stored only as:

product_id + stock_quantity

Use an individual asset model.

Example:

device

id  
product_id  
asset_code  
serial_number  
imei  
status  
condition  
purchase_date  
purchase_price  
current_booking_id  
last_maintenance_at  
next_maintenance_at  
notes  
created_at  
updated_at

Important:

Asset codes should be unique.

Example:

GS-IP13-001

GS-IP13-002

GS-GOPRO12-001

The system must preserve device history.

---

# 57. RENTAL AVAILABILITY DATA MODEL

Do NOT store public availability as a permanently hardcoded number that can become inconsistent.

Availability should be calculated from:

- Devices
- Device status
- Bookings
- Booking status
- Rental date ranges
- Device allocations
- Maintenance blocks
- Manual availability blocks

A cached or derived availability summary may be used for performance where appropriate, but the booking validation process must always verify actual availability.

---

# 58. RENTAL ORDER SNAPSHOT

When a rental booking is created, preserve:

- Product name at time of booking
- Product specifications where relevant
- Rental price
- Pricing rule
- Rental duration
- Deposit amount
- Delivery fee
- Discount
- Add-ons
- Late fee policy snapshot where appropriate
- Agreement version
- Total
- Booking channel (online / in_store / phone / whatsapp)
- Staff member who created the booking, if admin-initiated (Section 19B)

Do not calculate historical rentals using only current product prices.

Historical rentals must remain historically accurate.

If the admin changes an iPhone 13 daily rate tomorrow, previous bookings must not change.

---

# 59. API ARCHITECTURE

Create a clean API/service layer.

Do not put business logic directly inside UI components.

For example:

/services/products  
/services/devices  
/services/availability  
/services/bookings  
/services/rentals  
/services/checkouts  
/services/checkins  
/services/customers  
/services/deposits  
/services/payments  
/services/invoices  
/services/agreements  
/services/maintenance  
/services/tracking  
/services/inventory

Use typed interfaces/types.

Validate data at API boundaries.

Critical business logic such as availability and device assignment must be server-side.

---

# 60. STATE MANAGEMENT

Use appropriate state management.

Separate:

Server state

from

Client/UI state.

Rental cart state  
Date selection state  
Authentication state  
CMS data  
Product data  
Availability data

should not all be stored in one giant global state object.

The availability state should be refreshed when relevant booking inputs change.

---

# 61. ERROR HANDLING

Every important action must have:

Loading state  
Success state  
Error state  
Empty state

Examples:

"No rental devices found."

"No devices available for your selected dates."

"Your rental cart is empty."

"Unable to check availability."

"Unable to complete your booking. Please try again."

"This device is already assigned to another rental."

"Your rental has been successfully submitted."

"Device returned successfully and is awaiting inspection."

Do not expose raw technical errors to customers.

---

# 62. ANALYTICS

Design architecture to support analytics.

Track events such as:

product_view  
availability_checked  
rental_date_selected  
add_to_cart  
remove_from_cart  
checkout_started  
booking_submitted  
booking_completed  
whatsapp_clicked  
rental_extension_requested  
invoice_generated  
agreement_generated

This will help understand customer behavior.

Do not block the application if analytics is unavailable.

---

# 63. ADMIN AUDIT LOG

Important admin actions should be logged.

Examples:

Product created  
Product price changed  
Device added  
Device status changed  
Device assigned to rental  
Rental status changed  
Check-out completed  
Check-in completed  
Deposit refunded  
Damage recorded  
Maintenance created  
Invoice generated  
Agreement generated  
CMS updated  
Customer updated

Store:

- User
- Action
- Entity
- Entity ID
- Timestamp
- Relevant metadata

Audit logs should not expose sensitive information unnecessarily.

---

# 64. BOOKING CONFIRMATION FLOW

When customer submits a booking:

1. Validate selected dates.
2. Validate product availability.
3. Create booking.
4. Generate booking number.
5. Create customer if necessary.
6. Reserve availability according to booking rules.
7. Store pricing snapshot.
8. Store agreement acceptance.
9. Show confirmation.
10. Provide WhatsApp button.
11. Provide payment instructions if applicable.

Example:

"Thank you! Your rental booking has been received."

Display:

Booking number  
Rental summary  
Rental dates  
Pickup/delivery method  
Deposit requirement  
Payment instructions  
Next steps

Then:

"Contact Go-Sewa on WhatsApp"

with a contextual prefilled message.

Do not depend entirely on WhatsApp to store the booking.

The database is the source of truth.

---

# 65. RENTAL CUSTOMER EXPERIENCE

The primary customer journey should be:

HOME

↓

BROWSE DEVICES

↓

SELECT DEVICE

↓

SELECT RENTAL DATES

↓

CHECK AVAILABILITY

↓

ADD TO RENTAL CART

↓

ADD ACCESSORIES

↓

CHECKOUT

↓

REVIEW AGREEMENT

↓

SUBMIT BOOKING

↓

ORDER CONFIRMATION

↓

WHATSAPP / PAYMENT

↓

PICKUP OR DELIVERY

↓

ACTIVE RENTAL

↓

RETURN

Make every step obvious.

The customer should always understand:

- What they are renting
- When the rental starts
- When it must be returned
- How much it costs
- How much deposit is required
- What happens next

---

# 66. ADMIN EXPERIENCE

Admin flow:

LOGIN

↓

DASHBOARD

↓

BOOKINGS → BOOKING DETAIL

New bookings reach this screen from either direction:

- Public storefront checkout (Section 65), or
- DASHBOARD → "Add Rental" / BOOKINGS → "+ New Rental" → walk-in booking form (Section 19B)

Both paths land on the same BOOKING DETAIL screen and continue through the same steps below.

↓

ASSIGN DEVICE

↓

GENERATE INVOICE / AGREEMENT

↓

CHECK OUT DEVICE

↓

ACTIVE RENTAL

↓

RETURN

↓

INSPECTION

↓

DEPOSIT REFUND

↓

COMPLETED

And:

DASHBOARD

↓

PRODUCTS

↓

PHYSICAL DEVICES

↓

AVAILABILITY

↓

MAINTENANCE

↓

CRM

↓

CMS

↓

SETTINGS

The admin experience should minimize repetitive manual work.

---

# 67. VISUAL STYLE

Create a premium modern visual direction.

Suggested aesthetic:

- Clean neutral backgrounds
- Strong modern typography
- Technology-inspired details
- High-quality device photography
- Subtle gradients
- Premium whitespace
- Editorial product layouts
- Clear availability indicators
- Rounded but not overly playful cards
- Modern dashboard design
- Trustworthy financial and booking interfaces

Avoid:

- Generic Bootstrap appearance
- Generic electronics marketplace appearance
- Generic Shopify clone appearance
- Excessive glassmorphism
- Excessive gradients
- Excessive shadows
- Neon overload
- Overly complicated dashboards

The website should look like a real modern rental technology brand.

---

# 68. HOMEPAGE HERO

Create a visually impressive hero.

Possible messaging:

**"Rent the Tech You Need, When You Need It."**

Supporting text:

"From smartphones to action cameras, book premium devices for your trip, project, adventure, or content creation."

CTA:

"Browse Devices"

Secondary CTA:

"Check Availability"

Do not blindly use this copy if a stronger Go-Sewa-oriented version can be created.

---

# 69. PRODUCT CARD

Product cards should include:

Image  
Name  
Starting rental price  
Availability  
Category  
Badge  
Quick availability check if appropriate

Example badges:

AVAILABLE  
POPULAR  
NEW  
BEST FOR TRAVEL  
CREATOR PICK  
LIMITED AVAILABILITY

Do not overload cards with information.

The most important information should be easy to scan.

---

# 70. AVAILABILITY UX

Availability must be extremely clear.

Examples:

### Before dates selected

"Select your rental dates to check availability."

### Available

"Available for your selected dates"

### Low availability

"Only 1 left for your selected dates"

### Unavailable

"Not available for your selected dates"

### Maintenance

This should generally not appear as a customer-facing device status unless useful.

Do NOT show confusing technical inventory information to customers.

Translate internal operations into simple customer language.

---

# 71. FUTURE SCALABILITY

Design the architecture so Go-Sewa can later support:

- Multiple branches
- Multiple pickup locations
- Multiple warehouses
- Multiple staff
- Online payment
- Payment gateway integration
- Courier API
- Customer accounts
- Loyalty program
- Discount codes
- Membership plans
- Long-term rental subscriptions
- Insurance integrations
- GPS tracker integrations
- MDM integrations
- Manufacturer API integrations
- Marketplace integration
- Advanced analytics
- Automated reminders
- Email notifications
- SMS notifications
- Digital signatures
- Multi-location inventory
- Franchise or multi-business architecture

Do not implement all of these now unless required.

Build V1 with a strong foundation.

---

# 72. TECH STACK

Choose a modern production-ready stack.

Preferred approach:

Frontend:

Next.js + React + TypeScript

Styling:

Tailwind CSS or an equivalent scalable design system

Animation:

Framer Motion or equivalent

Backend:

Next.js server/API layer or a clean backend architecture

Database:

PostgreSQL

Backend-as-a-Service:

Supabase is acceptable and preferred if it simplifies authentication, database, storage, real-time functionality, and row-level security.

Storage:

Supabase Storage or equivalent.

Authentication:

Supabase Auth or equivalent.

Image handling:

Optimized responsive images.

Document generation:

Use a reliable PDF or print-optimized server-side solution.

If the current development environment requires a different stack, explain the trade-off before changing architecture.

---

# 73. CODE QUALITY

Use:

TypeScript  
Strict typing  
Reusable components  
Clear naming  
Modular architecture  
Separation of concerns  
Validation  
Error boundaries  
Loading states  
Tests for critical business logic

Avoid:

Huge components  
Duplicated code  
Hardcoded business rules  
Hardcoded product data  
Hardcoded WhatsApp numbers  
Hardcoded prices  
Hardcoded deposits  
Hardcoded late fees  
Hardcoded invoice templates  
Hardcoded agreement templates  
Hardcoded translations

---

# 74. SEED DATA

Create realistic seed data for development.

Include at least:

### Products

8+ rental products.

Examples:

- iPhone 13
- iPhone 15 Pro
- Samsung flagship device
- GoPro Hero
- Insta360 X series
- DJI action camera
- Mirrorless camera
- Gimbal

### Physical Devices

At least:

15+ individual physical device records.

Each should have realistic:

- Asset ID
- Status
- Serial number placeholder or development-safe value
- Condition
- Rental history

### Accessories

At least:

8 accessories.

### Customers

At least:

8 customers.

### Rentals

At least:

10 rentals with mixed statuses.

Include:

- Upcoming booking
- Active rental
- Completed rental
- Overdue rental
- Returned awaiting inspection
- Cancelled rental
- At least 2 created through the walk-in/in-store flow (Section 19B), not just the public checkout, so that path is demonstrably real

### Maintenance

At least:

3 maintenance records.

### Invoices

At least:

5 invoices.

### Agreements

At least:

3 rental agreement examples.

Use realistic Indonesian pricing.

Do not use copyrighted brand assets without permission.

Use placeholder images or generated local assets where necessary.

---

# 75. DEMO EXPERIENCE

When the website starts, it should already feel alive.

The demo should include:

Products  
Categories  
Physical devices  
Availability  
Customers  
Leads  
Rentals  
Active rentals  
Overdue example  
Maintenance records  
Check-out records  
Check-in records  
Deposit records  
Invoice template  
Rental agreement template  
CMS content  
Testimonials  
FAQ

Admin should be able to immediately demonstrate the complete workflow.

---

# 76. TESTING

Test critical flows.

### Customer

- Browse product
- Search
- Filter
- Select rental dates
- Check availability
- Select quantity
- Add to rental cart
- Update rental dates
- Add accessories
- Remove rental items
- Checkout
- Submit booking
- Accept agreement
- WhatsApp
- Language toggle

### Admin

- Login
- Add product
- Edit product
- Add physical device
- Change device status
- Search by asset ID
- Assign device to rental
- View booking
- Update booking
- Check out device
- Check in device
- Inspect device
- Add damage
- Create maintenance
- Extend rental
- Process overdue rental
- Manage deposit
- Generate invoice
- Edit invoice template
- Generate rental agreement
- Edit agreement template
- Edit CMS

Test edge cases:

- No devices available
- All devices rented
- Device under maintenance
- Device assigned to conflicting rental
- Two customers attempting to book the last device
- Invalid date range
- End date before start date
- Rental extension conflict
- Empty rental cart
- Invalid WhatsApp number
- Missing required customer information
- Device returned damaged
- Missing accessory
- Overdue return
- Price changed after previous booking
- Deposit partially refunded
- Network failure
- Deleted/archived product referenced by historical rental

---

# 77. IMPORTANT DEVELOPMENT RULE

DO NOT jump directly into writing hundreds of UI files.

First establish:

1. Architecture
2. Database schema
3. Data model
4. Device model
5. Availability model
6. Rental business rules
7. Pricing rules
8. Booking lifecycle
9. Routing
10. Component architecture
11. Design system
12. API/service layer
13. Authentication
14. Authorization
15. CMS architecture
16. Invoice architecture
17. Agreement architecture

Then build the UI.

---

# 78. DEVELOPMENT PHASES

Implement in phases.

## PHASE 1

Foundation

- Project setup
- TypeScript
- Database
- Authentication
- Authorization
- Design system
- Layout
- Localization
- Core settings

## PHASE 2

Product and Device Management

- Categories
- Products
- Product images
- Rental pricing
- Physical devices
- Asset IDs
- Device status
- Device history

## PHASE 3

Rental Availability

- Date range selection
- Availability engine
- Booking conflict prevention
- Reservation logic
- Availability calendar
- Turnaround buffer

## PHASE 4

Public Storefront

- Home
- Rent
- Product detail
- Search
- Filters
- Date selection
- Availability
- Rental cart

## PHASE 5

Checkout and Booking

- Checkout
- Customer information
- Rental period
- Pickup/delivery
- Return method
- Agreement acceptance
- Booking creation
- Confirmation
- WhatsApp

## PHASE 6

Admin CRM and Rental Operations

- Dashboard
- Customers
- Leads
- Rentals
- Rental detail
- Device assignment
- Check-out
- Check-in
- Inspection

## PHASE 7

Financial Management

- Payments
- Deposits
- Late fees
- Damage charges
- Invoice generation
- Invoice templates

## PHASE 8

Rental Agreements

- Agreement generation
- Agreement templates
- Booking data merge
- PDF/print
- Acceptance records
- Signature-ready architecture

## PHASE 9

Maintenance and Asset Operations

- Maintenance
- Damage records
- Device history
- Availability blocks
- QR/barcode asset support

## PHASE 10

CMS

- Products
- Categories
- Homepage
- FAQ
- Testimonials
- Settings
- SEO
- WhatsApp configuration

## PHASE 11

Optional Tracking Architecture

- Tracking configuration
- Provider abstraction
- Telemetry data model
- Last-known-location support where real provider integration exists

Do NOT fake live tracking.

## PHASE 12

Optimization

- SEO
- Performance
- Accessibility
- Security
- Testing
- Responsive polish
- Audit logging

---

# 79. CRITICAL RULE FOR AI DEVELOPMENT

You are an AI coding agent working on a real project.

Do NOT silently simplify requirements.

If a requirement is technically difficult:

1. Explain the technical limitation.
2. Propose the best production-friendly implementation.
3. Implement the closest robust solution.
4. Keep the architecture extensible.

Do not replace complex functionality with fake UI.

For example:

BAD:

A product page with a date picker that does not actually check rental availability.

GOOD:

A real date-based availability system that validates selected dates against existing rentals, reservations, device status, maintenance blocks, and physical device capacity.

Another example:

BAD:

A "Track Device" dashboard showing random GPS coordinates.

GOOD:

A real tracking integration architecture that displays data only when a supported GPS, MDM, or authorized tracking provider is connected.

---

# 80. DO NOT CREATE FAKE FUNCTIONALITY

Do not create buttons that only look functional.

Do not create:

"Check Availability" buttons that do nothing.

"Rent Now" buttons that only show an alert.

"Checkout" that does not create a booking.

"Assign Device" that does not actually reserve a physical asset.

"Check Out Device" that does not update rental and device status.

"Check In Device" that immediately marks damaged equipment as available.

"Generate Invoice" that only opens an alert.

"Generate Agreement" that creates static fake content unrelated to the booking.

"Track Device" that displays invented GPS data.

"CRM" that is just static cards.

"CMS" that cannot modify actual content.

"WhatsApp" that links to a fake number.

"Add Rental" that is not wired to the same booking, availability, and device-assignment logic as the public checkout (Section 19B).

Every major feature must actually work.

If an external integration is unavailable, create a clean abstraction and clearly mark the integration point.

---

# 81. DATA CONSISTENCY

The database must be the source of truth.

Do not maintain separate conflicting rental data in:

Frontend  
Backend  
CMS  
CRM  
Dashboard

Product pricing must come from the database/configuration.

Availability must come from actual rental and device data.

Historical booking snapshots must preserve historical values.

A device cannot have conflicting active assignments.

Device status must remain consistent with rental operations.

Examples:

A device marked:

maintenance

must not be available for booking.

A device marked:

rented

must be linked to an active rental or clearly identified as a manually corrected exception.

---

# 82. SEO + CMS REQUIREMENT

Admin should be able to manage SEO fields:

SEO title  
SEO description  
OG image  
Slug  
Canonical URL  
Index/noindex

For products and CMS pages.

---

# 83. URL STRUCTURE

Design clean URLs.

Examples:

/id  
/id/rent  
/id/rent/phones  
/id/rent/cameras  
/id/rent/action-cameras  
/id/rent/[slug]  
/id/how-it-works  
/id/about  
/id/faq  
/id/cart  
/id/checkout  
/id/booking/[bookingNumber]

English:

/en  
/en/rent  
/en/rent/phones  
/en/rent/cameras  
/en/rent/[slug]

Admin:

/admin  
/admin/dashboard  
/admin/bookings  
/admin/bookings/[id]  
/admin/customers  
/admin/leads  
/admin/products  
/admin/devices  
/admin/maintenance  
/admin/damages  
/admin/invoices  
/admin/agreements  
/admin/cms  
/admin/settings

Use appropriate localized SEO metadata.

---

# 84. FINAL UX STANDARD

Before considering the project complete, ask:

Would this feel trustworthy enough for a customer to hand over a deposit and rent an expensive device?

Would the customer clearly understand the rental dates and return deadline?

Can the customer easily see whether a device is available?

Can the system prevent double bookings?

Can the owner manage physical devices without editing code?

Can staff check out and check in devices efficiently?

Can the business identify which exact device a customer rented?

Can the owner quickly find overdue rentals?

Can the owner manage deposits, late fees, and damage charges?

Can a returned device be inspected before becoming available again?

Can the owner generate invoices and rental agreements without manually recreating documents?

Does the public website feel premium on a phone?

Does the site load quickly?

Does WhatsApp communication feel natural?

Does the admin dashboard reduce operational work instead of creating more work?

If the answer to any of these is no, improve it.

---

# 85. FINAL DELIVERABLE

Build the actual working application.

Do not merely provide a conceptual explanation.

At the end, provide:

1. Project architecture
2. Database schema
3. Entity relationships
4. Rental availability logic
5. Device status lifecycle
6. Booking lifecycle
7. Routes
8. Folder structure
9. Main components
10. Business logic
11. Setup instructions
12. Environment variables required
13. Seed data
14. Testing instructions
15. Known limitations
16. External integration points
17. Recommended next steps

Prioritize a functional production-quality V1 over unnecessary complexity.

The most important features are:

1. Premium rental storefront
2. Date-based rental availability
3. Automatic public availability updates
4. Individual physical device management
5. Asset ID, serial number, and IMEI management
6. Rental cart and checkout
7. Booking conflict prevention
8. Pickup / delivery / return management
9. WhatsApp CTA
10. Customer CRM
11. Rental management
12. Device assignment
13. Device check-out
14. Device check-in
15. Condition inspection with photos
16. Overdue management
17. Rental extension validation
18. Deposit management
19. Late fee management
20. Damage management
21. Maintenance management
22. Invoice generator + editable templates
23. Rental agreement generator + editable templates
24. CMS
25. Indonesian / English
26. SEO
27. Mobile-first responsive design
28. Smooth premium animations
29. Role-based access
30. Audit logs
31. Future-ready device tracking integration architecture
32. Scalable architecture

Do not sacrifice these requirements simply to make the initial implementation easier.

Start by presenting the proposed architecture, database schema, entity relationships, rental availability logic, device lifecycle, folder structure, key business rules, and implementation plan.

Then begin implementation systematically, phase by phase.