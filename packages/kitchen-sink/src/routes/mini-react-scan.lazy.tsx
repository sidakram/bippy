import { createLazyFileRoute } from '@tanstack/react-router';
import React, { useState, createContext, type ReactNode } from 'react';

interface TooltipContextType {
  tooltip: string;
}

const TooltipContext = createContext<TooltipContextType>({ tooltip: '' });

export const App = () => {
  const [tasks, setTasks] = useState<string[]>([]);

  return (
    <TooltipContext.Provider value={{ tooltip: 'Hello' }}>
      <div className="p-16 text-xs">
        <div className="main-content">
          <h1 id="btn-block-main-thread">Status: unblocked</h1>
          <br />
          <nav className="navbar">
            <a href="/" className="navbar-brand">
              <h3>
                <strong style={{ fontFamily: 'Geist Mono, monospace' }}>
                  React Scan
                </strong>
              </h3>
            </a>
          </nav>

          <div className="task-section">
            <AddTaskBar
              onCreate={(value: string) => {
                if (!value) return;
                setTasks([...tasks, value]);
              }}
            />
            <TaskList
              tasks={tasks}
              onDelete={(value: string) =>
                setTasks(tasks.filter((task) => task !== value))
              }
            />
          </div>
        </div>
      </div>
    </TooltipContext.Provider>
  );
};

interface TaskListProps {
  tasks: string[];
  onDelete: (task: string) => void;
}

export const TaskList = ({ tasks, onDelete }: TaskListProps) => {
  return (
    <ul className="mt-4 list-disc pl-4">
      {tasks.map((task) => (
        <TaskItem key={task} task={task} onDelete={onDelete} />
      ))}
    </ul>
  );
};

interface TaskItemProps {
  task: string;
  onDelete: (task: string) => void;
}

export const TaskItem = ({ task, onDelete }: TaskItemProps) => {
  const { tooltip } = React.useContext(TooltipContext);
  return (
    <li className="task-item" data-tooltip={tooltip}>
      {task}
      <Button onClick={() => onDelete(task)}>Delete</Button>
    </li>
  );
};

interface TextProps {
  children: ReactNode;
}

export const Text = ({ children }: TextProps) => {
  return <span>{children}</span>;
};

interface ButtonProps {
  onClick: () => void;
  children: ReactNode;
  id?: string;
}

export const Button = ({ onClick, children, id }: ButtonProps) => {
  return (
    <button
      id={id}
      type="button"
      className="ml-2 border border-gray-300 bg-black text-white rounded-md p-2"
      onClick={onClick}
    >
      <Text>{children}</Text>
    </button>
  );
};

interface AddTaskBarProps {
  onCreate: (value: string) => void;
}

export const AddTaskBar = ({ onCreate }: AddTaskBarProps) => {
  const [value, setValue] = useState<string>('');
  const [id, setId] = useState<number>(0);
  return (
    <div className="add-task-container flex">
      <Input
        onChange={(value) => setValue(value)}
        onEnter={async (value) => {
          onCreate(`${value} (${id})`);
          setValue('');
          setId(id + 1);
        }}
        value={value}
      />
      <Button
        onClick={async () => {
          onCreate(value);
          setValue('');
          const statusElement = document.getElementById(
            'btn-block-main-thread',
          );
          if (!statusElement) return;

          statusElement.textContent = 'blocked';
          statusElement.style.backgroundColor = 'red';
          await new Promise((resolve) => setTimeout(resolve, 0));
          for (let i = 0; i < 1000000000; i++) {}
          console.log('unblocking main thread');
          statusElement.textContent = 'unblocked';
          statusElement.style.backgroundColor = 'lightgreen';
        }}
      >
        Add Task and block main thread
      </Button>
    </div>
  );
};

interface InputProps {
  onChange: (value: string) => void;
  onEnter: (value: string) => void;
  value: string;
}

export const Input = ({ onChange, onEnter, value }: InputProps) => {
  return (
    <input
      type="text"
      className="border border-gray-300 rounded-md p-2"
      placeholder="Today I will..."
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.value)
      }
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && e.currentTarget.value) {
          onEnter(e.currentTarget.value);
        }
      }}
      value={value}
    />
  );
};

export default App;

export const Route = createLazyFileRoute('/mini-react-scan')({
  component: App,
});
