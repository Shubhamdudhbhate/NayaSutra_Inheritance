import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFIRById, listInvestigationFiles } from "@/services/policeService";
import AddSupplementModal from "@/components/police/AddSupplementModal";
import { FIR, InvestigationFile } from "@/types/case";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const FIRDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fir, setFir] = useState<FIR | null>(null);
  const [files, setFiles] = useState<InvestigationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    console.log("FIRDetails Page Mounted. Params ID:", id);
    if (!id) return;
    let mounted = true;
    const load = async () => {
      try {
        const f = await getFIRById(id);
        const fl = await listInvestigationFiles(id);
        if (!mounted) return;
        setFir(f);
        setFiles(fl);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center">
        <LoadingSpinner size={40} />
      </div>
    );
  }
  if (!fir) return <div>FIR not found</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">FIR Details</h2>
        <div>
          <button className="btn" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded">
        <div>
          <h3 className="font-medium">Basic Info</h3>
          <p>
            <strong>FIR Number:</strong> {fir.fir_number}
          </p>
          <p>
            <strong>Police Station:</strong> {fir.police_station}
          </p>
          <p>
            <strong>Informant:</strong> {fir.informant_name}{" "}
            ({fir.informant_contact})
          </p>
          <p>
            <strong>Incident:</strong>{" "}
            {new Date(fir.incident_date).toLocaleString()} at{" "}
            {fir.incident_place}
          </p>
        </div>
        <div>
          <h3 className="font-medium">Legal</h3>
          <p>
            <strong>Offense:</strong> {fir.offense_nature}
          </p>
          <p>
            <strong>BNS Section:</strong> {fir.bns_section}
          </p>
          <p>
            <strong>Victim:</strong> {fir.victim_name}
          </p>
          <p>
            <strong>Accused:</strong> {fir.accused_name ?? "Unknown"}
          </p>
        </div>
      </div>

      <div className="bg-white/5 p-4 rounded">
        <h3 className="font-medium mb-2">Description</h3>
        <div className="whitespace-pre-wrap">{fir.description}</div>
      </div>

      <div className="bg-white/5 p-4 rounded">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Investigation Timeline</h3>
          <div>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              Add Supplementary Chargesheet/Evidence
            </button>
          </div>
        </div>

        {files.length === 0
          ? (
            <div className="text-sm text-muted-foreground">
              No files uploaded yet.
            </div>
          )
          : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="p-2 bg-white/3 rounded flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{f.file_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {f.notes}
                    </div>
                  </div>
                  <a
                    href={f.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          )}
      </div>

      {showModal && (
        <AddSupplementModal
          firId={fir.id}
          onClose={() => setShowModal(false)}
          onAdded={(newFile) => setFiles((s) => [...s, newFile])}
        />
      )}
    </div>
  );
};

export default FIRDetails;
