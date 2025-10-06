#!/usr/bin/env python3
"""
Create test images for FTP monitoring
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_test_image(filename, plate_text, width=400, height=300):
    """Create a test image with plate text"""
    # Create image with white background
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple car shape
    car_color = (100, 100, 100)
    draw.rectangle([50, 150, 350, 250], fill=car_color)
    draw.ellipse([70, 240, 130, 280], fill=(50, 50, 50))  # wheel
    draw.ellipse([270, 240, 330, 280], fill=(50, 50, 50))  # wheel
    
    # Draw license plate
    plate_color = (255, 255, 0)
    draw.rectangle([150, 200, 250, 230], fill=plate_color, outline=(0, 0, 0), width=2)
    
    # Add plate text
    try:
        # Try to use a default font
        font_size = 16
        draw.text((200, 215), plate_text, fill=(0, 0, 0), anchor="mm")
    except:
        # Fallback if font loading fails
        draw.text((175, 210), plate_text, fill=(0, 0, 0))
    
    # Add timestamp
    draw.text((10, 10), "2025-09-25 21:30:00", fill=(0, 0, 0))
    
    # Save image
    img.save(filename, 'JPEG', quality=85)
    print(f"Created: {filename}")

# Create directory if it doesn't exist
image_dir = "./camera_uploads/camera001/192.168.1.54/2025-09-25/Common"
os.makedirs(image_dir, exist_ok=True)

# Create test images
test_images = [
    ("image_001.jpg", "STU234"),
    ("image_002.jpg", "DEF456"),
    ("image_003.jpg", "ABC123"),
    ("image_004.jpg", "XYZ789"),
    ("image_005.jpg", "GHI012"),
]

for filename, plate in test_images:
    filepath = os.path.join(image_dir, filename)
    create_test_image(filepath, plate)

print(f"Created {len(test_images)} test images in {image_dir}")
