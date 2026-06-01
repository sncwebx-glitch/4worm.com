import tkinter as tk
from tkinter import filedialog

class TeleprompterApp:
    def __init__(self, root):
        self.root = root
        self.root.title('Teleprompter')
        self.text = tk.StringVar()
        
        self.display_area = tk.Label(root, text='', font=('Arial', 24), wraplength=800, justify='center')
        self.display_area.pack(expand=True, fill='both')

        self.load_button = tk.Button(root, text="Load Script", command=self.load_script)
        self.load_button.pack(side='left', padx=10)

        self.scroll_speed = tk.DoubleVar(value=2)
        self.speed_slider = tk.Scale(root, variable=self.scroll_speed, from_=1, to=10, label="Scroll Speed", orient='horizontal')
        self.speed_slider.pack(side='right', padx=10)

        self.scroll_text = None
        self.text_content = ""
        self.scroll_pos = 0

    def load_script(self):
        file_path = filedialog.askopenfilename(title="Open Script File", filetypes=[("Text files", "*.txt")])
        if file_path:
            with open(file_path, 'r') as file:
                self.text_content = file.read()
            self.display_area.config(text=self.text_content)
            self.scroll_pos = 0
            self.start_scrolling()

    def start_scrolling(self):
        if self.scroll_text:
            self.root.after_cancel(self.scroll_text)

        def scroll():
            if self.scroll_pos < len(self.text_content):
                self.display_area.config(text=self.text_content[self.scroll_pos:self.scroll_pos+200])  # Scroll by small chunks
                self.scroll_pos += 1
                self.scroll_text = self.root.after(int(1000 / self.scroll_speed.get()), scroll)

        scroll()

if __name__ == '__main__':
    root = tk.Tk()
    app = TeleprompterApp(root)
    root.mainloop()