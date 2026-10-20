import os
import re

files = [
    "src/app/feed/page.tsx",
    "src/app/lists/page.tsx",
    "src/app/lists/[id]/page.tsx",
    "src/app/community/page.tsx",
    "src/app/profile/[id]/page.tsx",
    "src/app/dbms-console/page.tsx",
    "src/components/DbmsInspectorDrawer.tsx",
    "src/components/Footer.tsx"
]

replacements = [
    # special combinations first
    ("bg-brand-500 text-white", "bg-white text-black"),
    ("bg-brand-500", "bg-white"),
    ("bg-brand-600 text-white", "bg-gray-200 text-black"),
    ("bg-brand-600", "bg-gray-200"),
    ("hover:bg-brand-600", "hover:bg-gray-200"),
    
    ("text-cinema-slate", "text-gray-400"),
    ("text-cinema-muted", "text-gray-500"),
    ("text-cinema-amber", "text-white"),
    ("text-brand-400", "text-gray-400"),
    ("text-brand-500", "text-white"),
    
    ("hover:text-brand-400", "hover:text-gray-300"),
    ("border-brand-500", "border-white"),
    ("ring-brand-500", "ring-white"),
    ("focus:border-brand-500", "focus:border-white"),
    ("fill-brand-400", "fill-current"),
    ("fill-cinema-amber", "fill-current"),
    ("bg-cinema-amber/10", "bg-white/10"),
    ("bg-cinema-amber", "bg-white"),
    ("border-cinema-amber/20", "border-gray-800"),
    ("border-cinema-amber/30", "border-gray-700"),
    ("from-cinema-amber/5", "from-white/5"),
    ("to-cinema-amber", "to-white"),
    ("from-brand-600", "from-white"),
    
    ("bg-[#0c0e15]", "bg-gray-900"),
    ("bg-[#11141d]", "bg-gray-900"),
    ("bg-[#141822]", "bg-gray-800"),
    ("bg-[#07080b]", "bg-black"),
    
    ("border-white/5", "border-gray-900"),
    ("border-white/10", "border-gray-800"),
    ("border-white/15", "border-gray-700"),
    ("bg-white/5", "bg-gray-900"),
    ("bg-white/10", "bg-gray-800"),
    ("bg-white/20", "bg-gray-700")
]

base_dir = os.path.dirname(os.path.abspath(__file__))

for fpath in files:
    full_path = os.path.join(base_dir, fpath)
    if not os.path.exists(full_path):
        print(f"File not found: {full_path}")
        continue
        
    with open(full_path, "r") as f:
        content = f.read()
        
    for old, new in replacements:
        content = content.replace(old, new)
        
    def fix_class_string(match):
        cls_str = match.group(0)
        if "bg-white" in cls_str and "text-white" in cls_str:
            cls_str = cls_str.replace("text-white", "text-black")
        if "bg-gray-200" in cls_str and "text-white" in cls_str:
            cls_str = cls_str.replace("text-white", "text-black")
        return cls_str
        
    content = re.sub(r'(class(?:Name)?=)[\'"]([^\'"]+)[\'"]', fix_class_string, content)
    content = re.sub(r'(class(?:Name)?=\{`)([^`]+)(`\})', fix_class_string, content)

    with open(full_path, "w") as f:
        f.write(content)
        
print("Done")
