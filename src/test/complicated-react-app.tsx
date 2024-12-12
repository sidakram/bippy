import React, { useState, useEffect } from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}
export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};

interface InputFieldProps {
  value?: string;
  placeholder?: string;
  onChange: (val: string) => void;
}
export const InputField: React.FC<InputFieldProps> = ({
  value = '',
  placeholder = '',
  onChange,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    onChange(e.target.value);
  };
  return (
    <input
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
};

interface CardProps {
  title: string;
  content: string;
  footer?: string;
}
export const Card: React.FC<CardProps> = ({ title, content, footer }) => {
  return (
    <div style={{ border: '1px solid #ccc', padding: '12px' }}>
      <h2>{title}</h2>
      <p>{content}</p>
      {footer && <div>{footer}</div>}
    </div>
  );
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ open, onClose, children }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          margin: '100px auto',
          padding: '20px',
          width: '300px',
        }}
      >
        {children}
      </div>
    </div>
  );
};

interface NavBarProps {
  links: { label: string; href: string }[];
}
export const NavBar: React.FC<NavBarProps> = ({ links }) => {
  return (
    <nav style={{ background: '#eee', padding: '10px' }}>
      <ul
        style={{
          listStyle: 'none',
          display: 'flex',
          gap: '10px',
          margin: 0,
          padding: 0,
        }}
      >
        {links.map((l, i) => (
          <li key={i}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

interface SidebarProps {
  items: string[];
}
export const Sidebar: React.FC<SidebarProps> = ({ items }) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      style={{
        width: collapsed ? '50px' : '200px',
        transition: 'width 0.2s',
        background: '#ddd',
        height: '100vh',
      }}
    >
      <button onClick={() => setCollapsed((c) => !c)}>
        {collapsed ? '>' : '<'}
      </button>
      {!collapsed && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface DataTableProps {
  data: Array<{ [key: string]: any }>;
}
export const DataTable: React.FC<DataTableProps> = ({ data }) => {
  if (data.length === 0)
    return (
      <table>
        <tbody>
          <tr>
            <td>No Data</td>
          </tr>
        </tbody>
      </table>
    );
  const headers = Object.keys(data[0]);
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} style={{ border: '1px solid #999', padding: '5px' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {headers.map((h) => (
              <td key={h} style={{ border: '1px solid #999', padding: '5px' }}>
                {row[h]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

interface PaginationProps {
  current: number;
  total: number;
  onChange: (page: number) => void;
}
export const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  onChange,
}) => {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{ fontWeight: p === current ? 'bold' : 'normal' }}
        >
          {p}
        </button>
      ))}
    </div>
  );
};

interface NotificationBellProps {
  count?: number;
}
export const NotificationBell: React.FC<NotificationBellProps> = ({
  count = 0,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)}>🔔{count > 0 && count}</button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: '#fff',
            border: '1px solid #ccc',
            width: '200px',
            height: '100px',
          }}
        ></div>
      )}
    </div>
  );
};

interface SearchBarProps {
  onSearch: (query: string) => void;
}
export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [val, setVal] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(val);
  };
  return (
    <form onSubmit={handleSubmit}>
      <input value={val} onChange={(e) => setVal(e.target.value)} />
      <button type="submit">Search</button>
    </form>
  );
};

interface ProfileAvatarProps {
  imageUrl: string;
  size?: number;
}
export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  imageUrl,
  size = 50,
}) => {
  return (
    <img
      src={imageUrl}
      alt=""
      style={{ width: size, height: size, borderRadius: '50%' }}
    />
  );
};

interface TabsProps {
  tabs: { label: string; content: React.ReactNode }[];
}
export const Tabs: React.FC<TabsProps> = ({ tabs }) => {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{ fontWeight: i === active ? 'bold' : 'normal' }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs[active].content}</div>
    </div>
  );
};

interface AccordionProps {
  items: { title: string; content: string }[];
}
export const Accordion: React.FC<AccordionProps> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ border: '1px solid #ccc', marginBottom: '5px' }}>
          <div
            style={{ background: '#eee', padding: '5px', cursor: 'pointer' }}
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            {item.title}
          </div>
          {openIndex === i && (
            <div style={{ padding: '5px' }}>{item.content}</div>
          )}
        </div>
      ))}
    </div>
  );
};

interface BreadcrumbProps {
  paths: { label: string; href: string }[];
}
export const Breadcrumb: React.FC<BreadcrumbProps> = ({ paths }) => {
  return (
    <nav>
      <ul
        style={{
          display: 'flex',
          gap: '5px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {paths.map((p, i) => (
          <li key={i}>
            <a href={p.href}>{p.label}</a>
            {i < paths.length - 1 && '>'}
          </li>
        ))}
      </ul>
    </nav>
  );
};

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}
export const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [hover, setHover] = useState(false);
  return (
    <span
      style={{ position: 'relative' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      {hover && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: '#fff',
            padding: '5px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
};

interface DatePickerProps {
  onChange: (date: string) => void;
}
export const DatePicker: React.FC<DatePickerProps> = ({ onChange }) => {
  const [value, setValue] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };
  return <input type="date" value={value} onChange={handleChange} />;
};

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
}
export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect }) => {
  const [fileName, setFileName] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileSelect(file);
    setFileName(file ? file.name : '');
  };
  return (
    <div>
      <input type="file" onChange={handleChange} />
      {fileName}
    </div>
  );
};

interface RatingStarsProps {
  max?: number;
  onRate: (value: number) => void;
}
export const RatingStars: React.FC<RatingStarsProps> = ({
  max = 5,
  onRate,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const handleClick = (index: number) => {
    setRating(index);
    onRate(index);
  };
  return (
    <div>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            cursor: 'pointer',
            color:
              (hoverIndex != null && i <= hoverIndex) || i < rating
                ? '#fc0'
                : '#ccc',
          }}
          onMouseEnter={() => setHoverIndex(i)}
          onMouseLeave={() => setHoverIndex(null)}
          onClick={() => handleClick(i + 1)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

interface CarouselProps {
  images: string[];
  interval?: number;
}
export const Carousel: React.FC<CarouselProps> = ({
  images,
  interval = 3000,
}) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, interval);
    return () => {
      clearInterval(id);
    };
  }, [images, interval]);
  return (
    <div
      style={{
        position: 'relative',
        width: '300px',
        height: '200px',
        overflow: 'hidden',
      }}
    >
      {images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: i === index ? 0 : '100%',
            transition: 'left 0.5s',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ))}
    </div>
  );
};

interface TreeNode {
  label: string;
  children?: TreeNode[];
}
interface TreeViewProps {
  data: TreeNode[];
}
export const TreeView: React.FC<TreeViewProps> = ({ data }) => {
  return (
    <ul style={{ listStyle: 'none', paddingLeft: '20px' }}>
      {data.map((node, i) => (
        <TreeNodeItem key={i} node={node} />
      ))}
    </ul>
  );
};
const TreeNodeItem: React.FC<{ node: TreeNode }> = ({ node }) => {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <li>
      {hasChildren && (
        <span style={{ cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
          {open ? '▼' : '▶'}
        </span>
      )}
      {!hasChildren && <span>•</span>}
      <span style={{ marginLeft: '5px' }}>{node.label}</span>
      {hasChildren && open && (
        <ul style={{ listStyle: 'none', paddingLeft: '20px' }}>
          {node.children!.map((c, i) => (
            <TreeNodeItem key={i} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const App: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ratedValue, setRatedValue] = useState(0);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar items={['Item 1', 'Item 2', 'Item 3']} />
      <div style={{ flex: 1, padding: '20px' }}>
        <NavBar
          links={[
            { label: 'Home', href: '#' },
            { label: 'About', href: '#' },
            { label: 'Contact', href: '#' },
          ]}
        />
        <Breadcrumb
          paths={[
            { label: 'Home', href: '#' },
            { label: 'Section', href: '#' },
            { label: 'Current', href: '#' },
          ]}
        />
        <h1>Demo</h1>
        <Button label="Open Modal" onClick={() => setModalOpen(true)} />
        <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
          <Card
            title="Modal Title"
            content="Modal Content"
            footer="Footer Information"
          />
        </Modal>
        <NotificationBell count={3} />
        <SearchBar onSearch={(q) => setSearchQuery(q)} />
        <p>Search query: {searchQuery}</p>
        <InputField
          placeholder="Type here..."
          onChange={(v) => console.log(v)}
        />
        <ProfileAvatar imageUrl="https://via.placeholder.com/50" />
        <Tabs
          tabs={[
            { label: 'Tab 1', content: <div>Content 1</div> },
            { label: 'Tab 2', content: <div>Content 2</div> },
            { label: 'Tab 3', content: <div>Content 3</div> },
          ]}
        />
        <Accordion
          items={[
            { title: 'Section 1', content: 'Detail 1' },
            { title: 'Section 2', content: 'Detail 2' },
          ]}
        />
        <Tooltip text="This is a tooltip">
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>
            Hover me
          </span>
        </Tooltip>
        <DatePicker onChange={(date) => console.log('Selected Date:', date)} />
        <FileUploader onFileSelect={(f) => setSelectedFile(f)} />
        {selectedFile && <p>Selected file: {selectedFile.name}</p>}
        <RatingStars onRate={(val) => setRatedValue(val)} />
        <p>Rated Value: {ratedValue}</p>
        <Carousel
          images={[
            'https://via.placeholder.com/300x200?text=Image+1',
            'https://via.placeholder.com/300x200?text=Image+2',
            'https://via.placeholder.com/300x200?text=Image+3',
          ]}
        />
        <DataTable
          data={[
            { name: 'John', age: 30 },
            { name: 'Jane', age: 25 },
            { name: 'Bob', age: 40 },
          ]}
        />
        <Pagination current={page} total={5} onChange={(p) => setPage(p)} />
        <TreeView
          data={[
            {
              label: 'Root 1',
              children: [
                { label: 'Child 1.1' },
                { label: 'Child 1.2', children: [{ label: 'Child 1.2.1' }] },
              ],
            },
            { label: 'Root 2' },
          ]}
        />
      </div>
    </div>
  );
};
