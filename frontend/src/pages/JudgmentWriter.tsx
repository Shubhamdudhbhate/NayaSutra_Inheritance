import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckCircle2,
  Download,
  FileText,
  Italic,
  List,
  ListOrdered,
  PenLine,
  Printer,
  Redo,
  Save,
  Underline,
  Undo,
} from "lucide-react";
import { NyaySutraSidebar } from "@/components/dashboard/NyaySutraSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HistoryState {
  html: string;
  cursor: number;
}

const JudgmentWriter = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = setInterval(() => {
      if (editorRef.current?.innerHTML || title) {
        handleSave(true);
      }
    }, 30000);

    return () => clearInterval(autoSave);
  }, [title]);

  // Initialize history
  useEffect(() => {
    if (editorRef.current) {
      saveToHistory(editorRef.current.innerHTML);
    }
  }, []);

  // Track content changes
  const handleEditorInput = () => {
    if (editorRef.current) {
      saveToHistory(editorRef.current.innerHTML);
    }
  };

  const saveToHistory = (html: string) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push({
      html,
      cursor: document.getSelection()?.focusOffset || 0,
    });
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0 && editorRef.current) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      editorRef.current.innerHTML = history[newStep].html;
      editorRef.current.focus();
      toast.info("Undo");
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1 && editorRef.current) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      editorRef.current.innerHTML = history[newStep].html;
      editorRef.current.focus();
      toast.info("Redo");
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      saveToHistory(editorRef.current.innerHTML);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLastSaved(new Date());
    setIsSaving(false);
    if (!isAutoSave) {
      toast.success("Note saved successfully");
    }
  };

  const handlePrintPreview = () => {
    if (!editorRef.current) return;
    const printWindow = window.open("", "", "height=600,width=800");
    if (printWindow) {
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title || "Judge Notes"}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; }
            h1 { color: #1f2937; margin-bottom: 20px; }
            .content { color: #374151; }
          </style>
        </head>
        <body>
          <h1>${title || "Judge Notes"}</h1>
          <div class="content">${editorRef.current.innerHTML}</div>
        </body>
        </html>
      `;
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const { html2canvas } = await import("html2canvas");

      if (!editorRef.current) return;

      const canvas = await html2canvas(editorRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = canvas.height;
      let position = 0;

      pdf.setFontSize(16);
      pdf.text(title || "Judge Notes", 10, 10);
      position = 20;

      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      while (heightLeft >= 0) {
        pdf.addImage(
          imgData,
          "PNG",
          10,
          position,
          imgWidth,
          imgHeight,
        );
        heightLeft -= pageHeight;
        position += imgHeight + 10;
        if (heightLeft > 0) {
          pdf.addPage();
          position = 10;
        }
      }

      pdf.save(`${title || "judge-notes"}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      toast.error("Failed to export PDF");
    }
  };

  const handleExportDocx = async () => {
    try {
      const { Document, Packer, Paragraph, TextRun } = await import("docx");

      if (!editorRef.current) return;

      const htmlContent = editorRef.current.innerHTML;
      const plainText = editorRef.current.innerText;

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: title || "Judge Notes",
                heading: "Heading1",
                thematicBreak: false,
              }),
              new Paragraph({ text: "" }),
              ...plainText
                .split("\n")
                .filter((line) => line.trim())
                .map(
                  (line) =>
                    new Paragraph({
                      text: line,
                      spacing: { line: 360 },
                    }),
                ),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title || "judge-notes"}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("DOCX exported successfully");
    } catch (error) {
      toast.error("Failed to export DOCX - library not installed");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <NyaySutraSidebar />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <PenLine className="h-8 w-8 text-primary" />
              Judge Notes
            </h1>
            <p className="text-muted-foreground mt-1">
              Draft and maintain judicial notes
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                {isSaving
                  ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  )
                  : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Saved {format(lastSaved, "h:mm a")}
                    </>
                  )}
              </span>
            )}
            <Button variant="outline" onClick={() => handleSave()}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </motion.div>

        {/* Editor Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="card-glass border-border/50 h-[calc(100vh-220px)]">
            <CardHeader className="pb-3 border-b border-border/50">
              {/* Toolbar */}
              <div className="flex items-center gap-1 flex-wrap bg-secondary/30 -m-4 p-3 rounded-t-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  title="Undo"
                  onClick={handleUndo}
                  disabled={historyStep === 0}
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Redo"
                  onClick={handleRedo}
                  disabled={historyStep === history.length - 1}
                >
                  <Redo className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  title="Bold"
                  onClick={() => formatText("bold")}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Italic"
                  onClick={() => formatText("italic")}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Underline"
                  onClick={() => formatText("underline")}
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  title="Align Left"
                  onClick={() => formatText("justifyLeft")}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Align Center"
                  onClick={() => formatText("justifyCenter")}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Align Right"
                  onClick={() => formatText("justifyRight")}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  title="Bullet List"
                  onClick={() => formatText("insertUnorderedList")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Numbered List"
                  onClick={() => formatText("insertOrderedList")}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Select
                  onValueChange={(value) => {
                    if (value === "heading1") formatText("formatBlock", "h1");
                    else if (value === "heading2") {
                      formatText("formatBlock", "h2");
                    } else if (value === "heading3") {
                      formatText("formatBlock", "h3");
                    } else formatText("formatBlock", "p");
                  }}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heading1">Heading 1</SelectItem>
                    <SelectItem value="heading2">Heading 2</SelectItem>
                    <SelectItem value="heading3">Heading 3</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>

                {/* Right side tools */}
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrintPreview}
                    title="Print Preview"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportPDF}
                    title="Export as PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportDocx}
                    title="Export as DOCX"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto h-[calc(100%-140px)] flex flex-col">
              <Input
                ref={titleRef}
                placeholder="Enter note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-semibold mb-6 border-0 border-b rounded-none px-0 py-2 focus-visible:ring-0 bg-transparent"
              />
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                suppressContentEditableWarning
                className="min-h-[calc(100vh-450px)] p-2 text-base leading-relaxed bg-transparent focus-visible:outline-none flex-1 overflow-auto"
                style={{
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  whiteSpace: "pre-wrap",
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default JudgmentWriter;
