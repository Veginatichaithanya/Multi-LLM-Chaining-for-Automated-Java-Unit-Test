import sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.source_file import SourceFile

clean_code = """package com.ecommerce;

public class OrderProcessor {
    private double taxRate = 0.08;
    private double standardShipping = 10.0;
    private double freeShippingThreshold = 100.0;

    public double calculateTotal(double subtotal, double discount, String customerTier, boolean isExpressShipping) {
        if (subtotal < 0) {
            throw new IllegalArgumentException("Subtotal cannot be negative");
        }
        if (discount < 0) {
            throw new IllegalArgumentException("Discount cannot be negative");
        }

        double discounted = subtotal - discount;
        if (discounted < 0) {
            discounted = 0;
        }

        if ("VIP".equalsIgnoreCase(customerTier)) {
            discounted *= 0.90;
        } else if ("PREMIUM".equalsIgnoreCase(customerTier)) {
            discounted *= 0.95;
        }

        double tax = discounted * taxRate;

        double shipping = 0.0;
        if (discounted > 0) {
            if (discounted >= freeShippingThreshold) {
                shipping = isExpressShipping ? 15.0 : 0.0;
            } else {
                shipping = isExpressShipping ? (standardShipping + 15.0) : standardShipping;
            }
        }

        return Math.round((discounted + tax + shipping) * 100.0) / 100.0;
    }

    public boolean canCancelOrder(String orderStatus, int daysSinceOrder) {
        if (orderStatus == null || orderStatus.trim().isEmpty()) {
            return false;
        }
        if ("DELIVERED".equalsIgnoreCase(orderStatus) || "SHIPPED".equalsIgnoreCase(orderStatus)) {
            return false;
        }
        return "PENDING".equalsIgnoreCase(orderStatus) && daysSinceOrder <= 3;
    }
}
"""

db = SessionLocal()
s = db.query(SourceFile).filter(SourceFile.id == "8452fe89-cc61-41a3-90b9-050856db17ed").first()
if s:
    s.source_code = clean_code
    s.file_size = len(clean_code.encode("utf-8"))
    db.commit()
    print("Updated OrderProcessor.java successfully! Length:", len(s.source_code))
else:
    print("SourceFile 8452fe89-cc61-41a3-90b9-050856db17ed not found!")
db.close()
